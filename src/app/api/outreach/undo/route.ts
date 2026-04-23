/**
 * POST /api/outreach/undo — revert an approved outreach row while it is
 * still within the undo window.
 *
 * Body: { id: string (uuid) }
 *
 * The WHERE clause is the core invariant:
 *
 *   status = 'approved' AND send_after > now()
 *
 * When the cron sender (`send_after <= now()`) and this route's predicate
 * (`send_after >  now()`) disagree on the same row, Postgres resolves
 * the race atomically — only one of them matches at any instant. If the
 * undo arrives after the cron has already begun processing, zero rows
 * match and the route returns 409 too_late.
 *
 * On success: flips status back to 'pending_approval', clears approved_at,
 * stamps cancelled_at as an audit trail.
 */
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, requireUser } from "@/lib/supabase/server";

const BodySchema = z.object({ id: z.string().uuid() });

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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_queue")
    .update({
      status: "pending_approval",
      approved_at: null,
      cancelled_at: nowIso,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "approved")
    .gt("send_after", nowIso)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "too_late" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
