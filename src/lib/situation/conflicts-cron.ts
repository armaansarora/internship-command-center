/**
 * R7 — per-user conflict-detection worker. Invoked from the daily briefing
 * cron (/api/cron/briefing) so conflicts surface with the same cadence as
 * the morning snapshot.
 *
 * Idempotency: deduplicate by `pairId` stored in notification metadata.
 * A second run on the same day with the same conflicting pair creates
 * zero new notifications.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { detectConflicts, type ConflictEvent } from "./detect-conflicts";
import { log } from "@/lib/logger";

const WINDOW_DAYS = 14;

interface InterviewRow {
  id: string;
  company_name: string | null;
  round: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
}
interface CalendarRow {
  id: string;
  title: string | null;
  start_at: string | null;
  end_at: string | null;
}

function interviewToEvent(r: InterviewRow): ConflictEvent | null {
  if (!r.scheduled_at) return null;
  const startMs = new Date(r.scheduled_at).getTime();
  const durationMin = r.duration_minutes ?? 45;
  return {
    id: r.id,
    kind: "interview",
    title: `${r.round ?? "Interview"} · ${r.company_name ?? "Unknown"}`,
    startMs,
    endMs: startMs + durationMin * 60_000,
  };
}
function calendarToEvent(r: CalendarRow): ConflictEvent | null {
  if (!r.start_at || !r.end_at) return null;
  return {
    id: r.id,
    kind: "calendar_event",
    title: r.title ?? "(untitled event)",
    startMs: new Date(r.start_at).getTime(),
    endMs: new Date(r.end_at).getTime(),
  };
}

/**
 * Detect + notify on conflicts for a single user.
 * Returns the number of NEW notifications created (0 if every pair was
 * already surfaced on an earlier run).
 */
export async function detectConflictsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ newPairs: number; totalPairs: number }> {
  const nowIso = new Date().toISOString();
  const windowEndIso = new Date(Date.now() + WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [ivRes, ceRes] = await Promise.all([
    supabase
      .from("interviews")
      .select("id, company_name, round, scheduled_at, duration_minutes")
      .eq("user_id", userId)
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", windowEndIso),
    supabase
      .from("calendar_events")
      .select("id, title, start_at, end_at")
      .eq("user_id", userId)
      .gte("start_at", nowIso)
      .lte("start_at", windowEndIso),
  ]);

  const interviews = (ivRes.data ?? []) as unknown as InterviewRow[];
  const events = (ceRes.data ?? []) as unknown as CalendarRow[];
  const mapped: ConflictEvent[] = [
    ...interviews.map(interviewToEvent).filter((e): e is ConflictEvent => e !== null),
    ...events.map(calendarToEvent).filter((e): e is ConflictEvent => e !== null),
  ];

  const pairs = detectConflicts(mapped);
  if (pairs.length === 0) {
    return { newPairs: 0, totalPairs: 0 };
  }

  // Fetch existing conflict notifications for dedupe — just the pair ids
  // stored in metadata. Filter to unread OR recent to keep the window small.
  const { data: existing } = await supabase
    .from("notifications")
    .select("id, source_entity_id, body")
    .eq("user_id", userId)
    .eq("type", "calendar_conflict")
    .eq("is_dismissed", false);

  const existingPairIds = new Set<string>();
  for (const row of (existing ?? []) as Array<{ source_entity_id: string | null }>) {
    if (row.source_entity_id) existingPairIds.add(row.source_entity_id);
  }

  let newCount = 0;
  for (const pair of pairs) {
    if (existingPairIds.has(pair.pairId)) continue;
    const body = `${pair.a.title} overlaps ${pair.b.title}.`;
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: "calendar_conflict",
      priority: "critical",
      title: "Calendar conflict",
      body,
      source_agent: "coo",
      // Stash the deterministic pair id in source_entity_id for cheap dedupe.
      source_entity_id: pair.pairId,
      source_entity_type: "conflict_pair",
      channels: ["pneumatic_tube"],
      actions: [{ label: "Resolve on Floor 4", url: "/situation-room?focus=conflicts" }],
      is_read: false,
      is_dismissed: false,
    });
    if (error) {
      log.warn("conflicts_cron.insert_failed", {
        userId,
        pairId: pair.pairId,
        error: error.message,
      });
      continue;
    }
    newCount += 1;
  }

  return { newPairs: newCount, totalPairs: pairs.length };
}
