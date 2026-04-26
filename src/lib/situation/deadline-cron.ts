/**
 * per-user deadline beat cron. Invoked from /api/cron/briefing.
 *
 * Reads applications AND offers with `deadline_at` in the next ~26h (to
 * cover t_24h eligibility) + deadlines in the last hour (to cover t_0).
 * Computes eligible beats via `computeEligibleBeats`, fires a notification
 * per eligible beat, then atomically updates `deadline_alerts_sent` with
 * the beat key + ISO timestamp.
 *
 * R10 post-mortem: offers were added to the same pipeline so the R10
 * Proof-line "Deadline alerts fire" invariant is honored for offers, not
 * just applications.
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

type EntityKind = "application" | "offer";

interface DeadlineRow {
  id: string;
  label: string;
  deadline_at: string;
  deadline_alerts_sent: Partial<Record<BeatKind, string>> | null;
  entity: EntityKind;
}

function notifSurfaceFor(entity: EntityKind): {
  source_entity_type: "application" | "offer";
  actionLabel: string;
  actionUrl: string;
} {
  return entity === "offer"
    ? { source_entity_type: "offer", actionLabel: "Open Parlor", actionUrl: "/parlor" }
    : {
        source_entity_type: "application",
        actionLabel: "Open Situation Room",
        actionUrl: "/situation-room",
      };
}

export async function fireDeadlineBeatsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ beatsFired: number }> {
  const nowMs = Date.now();
  const windowStart = new Date(nowMs - 2 * HOUR_MS).toISOString();
  const windowEnd = new Date(nowMs + 26 * HOUR_MS).toISOString();

  const [appsRes, offersRes] = await Promise.all([
    supabase
      .from("applications")
      .select("id, company_name, role, deadline_at, deadline_alerts_sent")
      .eq("user_id", userId)
      .not("deadline_at", "is", null)
      .gte("deadline_at", windowStart)
      .lte("deadline_at", windowEnd),
    supabase
      .from("offers")
      .select("id, company_name, role, deadline_at, deadline_alerts_sent")
      .eq("user_id", userId)
      .not("deadline_at", "is", null)
      .gte("deadline_at", windowStart)
      .lte("deadline_at", windowEnd),
  ]);

  if (appsRes.error) {
    log.warn("deadline_cron.fetch_failed", {
      userId,
      scope: "applications",
      error: appsRes.error.message,
    });
  }
  if (offersRes.error) {
    log.warn("deadline_cron.fetch_failed", {
      userId,
      scope: "offers",
      error: offersRes.error.message,
    });
  }
  if (appsRes.error && offersRes.error) return { beatsFired: 0 };

  const appRows = (appsRes.data ?? []).map((r): DeadlineRow => ({
    id: r.id,
    label: r.company_name ?? r.role ?? "Application",
    deadline_at: r.deadline_at,
    deadline_alerts_sent: r.deadline_alerts_sent ?? {},
    entity: "application",
  }));
  const offerRows = (offersRes.data ?? []).map((r): DeadlineRow => ({
    id: r.id,
    label: r.company_name ?? r.role ?? "Offer",
    deadline_at: r.deadline_at,
    deadline_alerts_sent: r.deadline_alerts_sent ?? {},
    entity: "offer",
  }));
  const rows = [...appRows, ...offerRows];

  const inputs: (DeadlineAppInput & { entity: EntityKind })[] = rows.map((r) => ({
    id: r.id,
    company: r.label,
    deadlineAtMs: new Date(r.deadline_at).getTime(),
    alertsSent: r.deadline_alerts_sent ?? {},
    entity: r.entity,
  }));

  const fires = computeEligibleBeats(inputs, nowMs);
  if (fires.length === 0) return { beatsFired: 0 };

  let fired = 0;
  for (const fire of fires) {
    const row = rows.find((r) => r.id === fire.appId);
    if (!row) continue;
    const surface = notifSurfaceFor(row.entity);
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
      source_entity_type: surface.source_entity_type,
      channels: ["pneumatic_tube"],
      actions: [{ label: surface.actionLabel, url: surface.actionUrl }],
      is_read: false,
      is_dismissed: false,
    });
    if (notifRes.error) {
      log.warn("deadline_cron.notif_failed", {
        userId,
        entityType: row.entity,
        entityId: fire.appId,
        kind: fire.kind,
        error: notifRes.error.message,
      });
      continue;
    }

    // Stamp the beat key. Read-merge-write (Supabase REST doesn't have a
    // clean jsonb_set; merge the existing map client-side).
    const merged: Partial<Record<BeatKind, string>> = {
      ...(row.deadline_alerts_sent ?? {}),
      [fire.kind]: new Date(nowMs).toISOString(),
    };
    const table = row.entity === "offer" ? "offers" : "applications";
    const updateRes = await supabase
      .from(table)
      .update({ deadline_alerts_sent: merged })
      .eq("id", fire.appId)
      .eq("user_id", userId);
    if (updateRes.error) {
      log.warn("deadline_cron.stamp_failed", {
        userId,
        entityType: row.entity,
        entityId: fire.appId,
        kind: fire.kind,
        error: updateRes.error.message,
      });
      continue;
    }
    fired += 1;
  }
  return { beatsFired: fired };
}
