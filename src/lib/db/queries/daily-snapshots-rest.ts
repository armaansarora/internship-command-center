import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import type { SnapshotPoint } from "@/lib/penthouse/momentum";

/**
 * Recent daily_snapshots rows for one user, ascending by date.
 * Degrades to [] on any failure — momentum is decoration, never a 500.
 * (Pattern: src/app/api/cfo/route.ts snapshot read.)
 */
export async function getRecentSnapshotsRest(
  userId: string,
  days = 14
): Promise<SnapshotPoint[]> {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    // Descending + limit keeps the NEWEST rows by construction, then reverse
    // to ascending for the chart. (Siege kill: ascending + limit truncated the
    // window from the front and silently dropped today's snapshot.)
    const { data, error } = await supabase
      .from("daily_snapshots")
      .select(
        "date, total_applications, active_pipeline, applied_count, interview_count, offer_count, stale_count"
      )
      .eq("user_id", userId)
      .gte("date", since)
      .order("date", { ascending: false })
      .limit(days);
    if (error) {
      log.error("daily-snapshots-rest: fetch failed", { userId, error: error.message });
      return [];
    }
    return (data ?? []).reverse().map((s) => ({
      date: s.date as string,
      totalApplications: (s.total_applications as number | null) ?? 0,
      activePipeline: (s.active_pipeline as number | null) ?? 0,
      appliedCount: (s.applied_count as number | null) ?? 0,
      interviewCount: (s.interview_count as number | null) ?? 0,
      offerCount: (s.offer_count as number | null) ?? 0,
      staleCount: (s.stale_count as number | null) ?? 0,
    }));
  } catch (err) {
    log.error("daily-snapshots-rest: unexpected", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
