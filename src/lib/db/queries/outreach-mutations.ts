import type { SupabaseClient } from "@supabase/supabase-js";

export interface ApproveOpts {
  /**
   * Clamps the effective `send_after` to at least `now() + seconds`, regardless
   * of the caller's `sendAfter` argument. Load-bearing for R10.10's 24h
   * negotiation hold — callers cannot bypass the hold by omitting or
   * antedating `sendAfter`.
   */
  minimumHoldSeconds?: number;
}

export interface ApproveResult {
  id: string;
  /** ISO timestamp of the written `send_after`. */
  sendAfter: string;
}

/**
 * Approve a pending_approval outreach row for a given user.
 *
 * R7.2 — callers may pass an explicit `sendAfter` Date to stamp the
 * undo window. When omitted, the row is immediately eligible for the
 * cron sender (send_after = now()), which preserves the pre-R7 behavior
 * for legacy callers. The R7 path (/api/outreach/approve) is the
 * canonical entry point and always passes now()+30s.
 *
 * R10.10 — `opts.minimumHoldSeconds` clamps the written `send_after` to
 * at least `now() + minimumHoldSeconds`, even if the caller passed an
 * earlier `sendAfter`. This is the server-side enforcement of the 24h
 * negotiation send-hold: hand-crafted POSTs cannot bypass by passing a
 * sooner `sendAfter`, because the helper itself picks `max(desired, clamp)`.
 *
 * Returns the updated row's `{id, sendAfter}` on success, or `null` when no
 * `pending_approval` row matched (status filter, or row id / user mismatch).
 * The `status='pending_approval'` precondition in the UPDATE is the
 * double-approve safety net.
 */
export async function approveOutreachForUser(
  supabase: SupabaseClient,
  userId: string,
  outreachId: string,
  sendAfter?: Date,
  opts: ApproveOpts = {},
): Promise<ApproveResult | null> {
  const now = new Date();
  const desired = sendAfter ?? now;
  const minimum = opts.minimumHoldSeconds
    ? new Date(now.getTime() + opts.minimumHoldSeconds * 1000)
    : desired;
  const effective =
    desired.getTime() >= minimum.getTime() ? desired : minimum;

  const { data, error } = await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: now.toISOString(),
      send_after: effective.toISOString(),
      cancelled_at: null,
    })
    .eq("id", outreachId)
    .eq("user_id", userId)
    .eq("status", "pending_approval")
    .select("id, send_after")
    .single();

  if (error || !data) return null;
  const row = data as { id: string; send_after: string };
  return { id: row.id, sendAfter: row.send_after };
}
