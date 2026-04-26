import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rebuildMatchIndexForUser } from "./rebuild-match-index";
import { log } from "@/lib/logger";

const DEBOUNCE_MS = 5 * 60 * 1000;

/**
 * Fire-and-forget per-user match-index rebuild, debounced 5 min.
 *
 * Called from contact + application REST mutations (createContactRest,
 * updateContactActivity, linkContactToApplication, createApplicationRest,
 * updateApplicationRest, updateApplicationStatusRest) so the user's match
 * index doesn't go stale between nightly cron runs.
 *
 * Best-effort — swallows all errors so it never blocks the calling
 * mutation.  Callers should `void enqueueMatchRescan(userId).catch(() => {})`
 * and NEVER `await`; the rebuild itself is expensive and the mutation has
 * already succeeded.
 *
 * Debounce storage: `user_profiles.match_index_last_rescan_at` (R11.2
 * migration).  If `last_rescan_at` is within DEBOUNCE_MS of now, skip.
 */
export async function enqueueMatchRescan(userId: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("user_profiles")
      .select("match_index_last_rescan_at")
      .eq("id", userId)
      .maybeSingle();
    const last = (data?.match_index_last_rescan_at as string | null) ?? null;
    if (last && Date.now() - new Date(last).getTime() < DEBOUNCE_MS) return;

    await rebuildMatchIndexForUser(userId);

    await admin
      .from("user_profiles")
      .update({ match_index_last_rescan_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (err) {
    try {
      log.warn("match_delta.failed", {
        userId,
        error: err instanceof Error ? err.message : "unknown",
      });
    } catch {
      // Logger itself can throw if env validation fails under test.  The
      // delta trigger is best-effort — swallow everything, including the log.
    }
  }
}
