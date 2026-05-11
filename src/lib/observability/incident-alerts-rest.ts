/**
 * Incident Alerts REST helpers — Lighthouse Watchdog state machine.
 *
 * `incident_alerts` is the durable record of which production signals the
 * watchdog cron (every 30 minutes) is currently paging the owner about.
 * One row per (jobName, opened_at) episode; `resolved_at = NULL` means
 * the incident is still open. The watchdog uses these helpers to:
 *
 *   1. `findOpenIncident(jobName)` — O(1) lookup against the
 *      `idx_incident_alerts_job_open` index. Used to decide between OPEN,
 *      REMINDER, RECOVERED, and NOOP per signal each tick.
 *   2. `openIncident(...)` — INSERT a new row when the watchdog sees a
 *      signal trip for the first time. Stamps `last_email_at = now()`
 *      because the watchdog always sends a digest on open.
 *   3. `stampReminder(id)` — UPDATE `last_email_at = now()` when the
 *      incident is still open after the 6h reminder window has elapsed.
 *   4. `resolveIncident(id)` — UPDATE `resolved_at = now()` + stamp the
 *      `last_email_at` for the recovery digest.
 *
 * All paths use the service-role admin client. `incident_alerts` is
 * RLS-default-deny with REVOKEd authenticated/anon privileges
 * (migration 0036), so user-scoped clients cannot even attempt a read —
 * mirroring the `stripe_webhook_events` and `comp_bands_budget` posture.
 *
 * Schema definition: src/db/schema.ts → incidentAlerts (§24).
 * Migration: src/db/migrations/0036_incident_alerts.sql.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import type { Row } from "@/db/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** snake_case `incident_alerts` row, derived from the Drizzle schema. */
export type IncidentAlertRow = Row<"incident_alerts">;

/** Severity enum exposed for callers that branch on warn vs crit. */
export type IncidentSeverity = IncidentAlertRow["severity"];

/**
 * Input shape for `openIncident`. Mirrors the column set the watchdog
 * needs to control on insert. `lastSeenValue` is optional because not
 * every signal carries a useful numeric snapshot (e.g. "cron stale by
 * 4h 12m" is one; "3 failed webhooks in 24h" is another).
 */
export interface OpenIncidentInput {
  jobName: string;
  severity: IncidentSeverity;
  lastSeenValue?: string | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the currently-open incident for a given job_name. Returns the row
 * or `null` if no incident is currently open (or on any error path — the
 * watchdog treats "we don't know" the same as "it's not open" to avoid
 * cascading false negatives into duplicate emails).
 *
 * Backed by `idx_incident_alerts_job_open (job_name, resolved_at)` so the
 * lookup stays O(1) even as the table accumulates years of closed rows.
 */
export async function findOpenIncident(
  jobName: string,
): Promise<IncidentAlertRow | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("incident_alerts")
    .select("*")
    .eq("job_name", jobName)
    .is("resolved_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log.error("incident_alerts.find_open_failed", undefined, {
      jobName,
      error: error.message,
    });
    return null;
  }

  return (data as IncidentAlertRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Insert a new open incident row and stamp `last_email_at = now()`.
 *
 * The watchdog only calls this when `findOpenIncident` already returned
 * null, so there is no race window with itself. If two cron ticks ever
 * collided (Vercel cron is at-least-once), the unique-row contract is
 * advisory; the worst-case is two open rows for the same job_name,
 * which `findOpenIncident` resolves by picking the most recent.
 *
 * Returns the new id, or `null` on failure (logged once so the watchdog
 * can degrade to a structured-log-only digest rather than crash).
 */
export async function openIncident(
  input: OpenIncidentInput,
): Promise<IncidentAlertRow | null> {
  const supabase = getSupabaseAdmin();

  const nowIso = new Date().toISOString();
  const payload = {
    job_name: input.jobName,
    severity: input.severity,
    last_seen_value: input.lastSeenValue ?? null,
    opened_at: nowIso,
    last_email_at: nowIso,
  };

  const { data, error } = await supabase
    .from("incident_alerts")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    log.error("incident_alerts.open_failed", undefined, {
      jobName: input.jobName,
      severity: input.severity,
      error: error.message,
    });
    return null;
  }

  return data as IncidentAlertRow;
}

/**
 * Stamp `last_email_at = now()` on an open incident so the next reminder
 * window starts from this moment. Called when the watchdog re-pages the
 * owner about an incident that has been open longer than 6 hours.
 *
 * Returns true on success, false otherwise. Failure is logged once and
 * non-fatal — the next tick will try again.
 */
export async function stampReminder(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("incident_alerts")
    .update({ last_email_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    log.error("incident_alerts.stamp_reminder_failed", undefined, {
      id,
      error: error.message,
    });
    return false;
  }

  return true;
}

/**
 * Close an open incident — stamp `resolved_at = now()` and refresh
 * `last_email_at` so the recovery digest is recorded. Caller is expected
 * to also send the recovery email; this helper only mutates the row.
 *
 * Returns true on success, false otherwise.
 */
export async function resolveIncident(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("incident_alerts")
    .update({ resolved_at: nowIso, last_email_at: nowIso })
    .eq("id", id);

  if (error) {
    log.error("incident_alerts.resolve_failed", undefined, {
      id,
      error: error.message,
    });
    return false;
  }

  return true;
}
