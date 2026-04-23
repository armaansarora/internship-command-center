/**
 * R7 — per-user deadline beat cron. Invoked from /api/cron/briefing.
 *
 * Reads applications with `deadline_at` in the next ~26h (to cover t_24h
 * eligibility) + deadlines in the last hour (to cover t_0). Computes
 * eligible beats via `computeEligibleBeats`, fires a notification per
 * eligible beat, then atomically updates `deadline_alerts_sent` with the
 * beat key + ISO timestamp.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeEligibleBeats,
  beatCopy,
  type BeatKind,
  type DeadlineAppInput,
} from "./deadline-beats";
import { log } from "@/lib/logger";

const HOUR_MS = 60 * 60 * 1000;

interface DeadlineAppRow {
  id: string;
  company_name: string | null;
  role: string | null;
  deadline_at: string;
  deadline_alerts_sent: Partial<Record<BeatKind, string>> | null;
}

export async function fireDeadlineBeatsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ beatsFired: number }> {
  const nowMs = Date.now();
  const windowStart = new Date(nowMs - 2 * HOUR_MS).toISOString();
  const windowEnd = new Date(nowMs + 26 * HOUR_MS).toISOString();

  const { data, error } = await supabase
    .from("applications")
    .select("id, company_name, role, deadline_at, deadline_alerts_sent")
    .eq("user_id", userId)
    .not("deadline_at", "is", null)
    .gte("deadline_at", windowStart)
    .lte("deadline_at", windowEnd);

  if (error) {
    log.warn("deadline_cron.fetch_failed", { userId, error: error.message });
    return { beatsFired: 0 };
  }

  const rows = (data ?? []) as DeadlineAppRow[];
  const apps: DeadlineAppInput[] = rows.map((r) => ({
    id: r.id,
    company: r.company_name ?? r.role ?? "Application",
    deadlineAtMs: new Date(r.deadline_at).getTime(),
    alertsSent: r.deadline_alerts_sent ?? {},
  }));

  const fires = computeEligibleBeats(apps, nowMs);
  if (fires.length === 0) return { beatsFired: 0 };

  let fired = 0;
  for (const fire of fires) {
    const { title, body } = beatCopy(fire.kind, fire.company);
    // Fire the notification first, THEN stamp the beat — if notification
    // insert fails, the stamp is skipped so the next run retries.
    const notifRes = await supabase.from("notifications").insert({
      user_id: userId,
      type: "deadline_beat",
      priority: fire.kind === "t_0" ? "critical" : fire.kind === "t_4h" ? "high" : "medium",
      title,
      body,
      source_agent: "coo",
      source_entity_id: fire.appId,
      source_entity_type: "application",
      channels: ["pneumatic_tube"],
      actions: [{ label: "Open Situation Room", url: "/situation-room" }],
      is_read: false,
      is_dismissed: false,
    });
    if (notifRes.error) {
      log.warn("deadline_cron.notif_failed", {
        userId,
        appId: fire.appId,
        kind: fire.kind,
        error: notifRes.error.message,
      });
      continue;
    }

    // Stamp the beat key. Read-merge-write (Supabase REST doesn't have a
    // clean jsonb_set; merge the existing map client-side).
    const existing =
      rows.find((r) => r.id === fire.appId)?.deadline_alerts_sent ?? {};
    const merged: Partial<Record<BeatKind, string>> = {
      ...existing,
      [fire.kind]: new Date(nowMs).toISOString(),
    };
    const updateRes = await supabase
      .from("applications")
      .update({ deadline_alerts_sent: merged })
      .eq("id", fire.appId)
      .eq("user_id", userId);
    if (updateRes.error) {
      log.warn("deadline_cron.stamp_failed", {
        userId,
        appId: fire.appId,
        kind: fire.kind,
        error: updateRes.error.message,
      });
      continue;
    }
    fired += 1;
  }
  return { beatsFired: fired };
}
