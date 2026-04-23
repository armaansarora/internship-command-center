/**
 * POST /api/outreach/approve — stamp the undo window on a pending_approval
 * outreach row.
 *
 * Body: { id: string (uuid) }
 *
 * On success: writes status='approved', approved_at=now(),
 *             send_after = now() + UNDO_WINDOW_SECONDS,
 *             cancelled_at=null.
 *
 * The cron sender (GET /api/cron/outreach-sender) filters by
 * `send_after <= now()`; the undo route filters by `send_after > now()`.
 * Those two predicates are mutually exclusive at every instant — the race
 * between a late-clicked cancel and an early cron tick is resolved
 * atomically by Postgres timestamp comparison, not by UI animation.
 *
 * This is the load-bearing half of the "real undo" promise. A UI-only
 * countdown that hides an already-delivered email is the failure mode
 * this route exists to defeat.
 */
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, requireUser } from "@/lib/supabase/server";

const BodySchema = z.object({ id: z.string().uuid() });

export const UNDO_WINDOW_SECONDS = 30;

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
  const nowIso = new Date().toISOString();
  const sendAfterIso = new Date(
    Date.now() + UNDO_WINDOW_SECONDS * 1000,
  ).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: nowIso,
      send_after: sendAfterIso,
      cancelled_at: null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending_approval")
    .select("id, send_after")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    sendAfter: data.send_after,
  });
}
