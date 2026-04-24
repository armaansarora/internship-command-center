/**
 * POST /api/outreach/approve — stamp the undo window on a pending_approval
 * outreach row.
 *
 * Body: { id: string (uuid) }
 *
 * On success: writes status='approved', approved_at=now(),
 *             send_after = now() + (UNDO_WINDOW_SECONDS | NEGOTIATION_HOLD_SECONDS),
 *             cancelled_at=null.
 *
 * The cron sender (GET /api/cron/outreach-sender) filters by
 * `send_after <= now()`; the undo route filters by `send_after > now()`.
 * Those two predicates are mutually exclusive at every instant — the race
 * between a late-clicked cancel and an early cron tick is resolved
 * atomically by Postgres timestamp comparison, not by UI animation.
 *
 * R10.10 — negotiation outreach (`type === 'negotiation'`) gets a 24-hour
 * minimum send-hold, clamped SERVER-SIDE. This route reads the queued row's
 * `type` column itself (NOT from the request body) and passes
 * `minimumHoldSeconds: 86400` to `approveOutreachForUser` when the type is
 * negotiation. A hand-crafted POST cannot bypass the hold — `type` is not a
 * user-supplied field on this route, and the helper itself enforces
 * `send_after >= now() + minimumHoldSeconds` regardless of caller input.
 *
 * This is the load-bearing half of the "real undo" promise. A UI-only
 * countdown that hides an already-delivered email is the failure mode
 * this route exists to defeat.
 */
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, requireUser } from "@/lib/supabase/server";
import { approveOutreachForUser } from "@/lib/db/queries/outreach-mutations";

const BodySchema = z.object({ id: z.string().uuid() });

export const UNDO_WINDOW_SECONDS = 30;
/** R10.10 — 24h minimum hold for negotiation outreach. */
export const NEGOTIATION_HOLD_SECONDS = 86400;

export async function POST(req: Request): Promise<NextResponse> {
  const user = await requireUser();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { id } = parsed.data;
  const supabase = await createClient();

  // R10.10 — server-side read of queued row.type. A hand-crafted POST cannot
  // bypass the 24h clamp because `type` is decided by the INSERT that queued
  // the row (see /api/offers/:id/negotiation-draft), not by this request.
  const { data: row } = await supabase
    .from("outreach_queue")
    .select("type")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending_approval")
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const minimumHoldSeconds =
    (row as { type: string | null }).type === "negotiation"
      ? NEGOTIATION_HOLD_SECONDS
      : undefined;
  const sendAfterBase = new Date(Date.now() + UNDO_WINDOW_SECONDS * 1000);

  const result = await approveOutreachForUser(
    supabase,
    user.id,
    id,
    sendAfterBase,
    { minimumHoldSeconds },
  );

  if (!result) {
    // Possible TOCTOU: row passed the type lookup but got approved/cancelled
    // between the SELECT and the UPDATE. Surface as 404 — the client's next
    // refetch will reconcile state.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    sendAfter: result.sendAfter,
  });
}
