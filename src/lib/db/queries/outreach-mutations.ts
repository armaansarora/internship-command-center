import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Approve a pending_approval outreach row for a given user.
 *
 * R7.2 — callers may pass an explicit `sendAfter` Date to stamp the
 * undo window. When omitted, the row is immediately eligible for the
 * cron sender (send_after = now()), which preserves the pre-R7 behavior
 * for legacy callers. The R7 path (/api/outreach/approve) is the
 * canonical entry point and always passes now()+30s.
 */
export async function approveOutreachForUser(
  supabase: SupabaseClient,
  userId: string,
  outreachId: string,
  sendAfter?: Date,
): Promise<void> {
  const now = new Date();
  const sendAfterIso = (sendAfter ?? now).toISOString();
  await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: now.toISOString(),
      send_after: sendAfterIso,
      cancelled_at: null,
    })
    .eq("id", outreachId)
    .eq("user_id", userId);
}
