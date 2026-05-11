-- 0036_incident_alerts.sql
-- Lighthouse Watchdog — owner-only diagnostic state machine.
--
-- The /api/cron/owner-watchdog handler reads three production signals every
-- 30 minutes (stale crons, recent Stripe webhook failures, hourly AI cost
-- rollup) and emails the owner when something is wrong. To avoid paging on
-- every tick during an ongoing incident, the watchdog persists each open
-- incident in this table:
--
--   * detection sees a NEW problem (no row with job_name=X AND
--     resolved_at IS NULL) → INSERT row + email digest.
--   * detection sees an EXISTING problem and last_email_at older than 6h
--     → UPDATE last_email_at + email reminder.
--   * detection sees the signal back below threshold for an open incident
--     → UPDATE resolved_at + email recovery.
--
-- Posture: service-role-only. This is owner-only operational telemetry,
-- not user data; no authenticated client should be able to read or write
-- it. RLS is enabled with NO policy (default-deny) and the explicit REVOKE
-- below mirrors the stripe_webhook_events / comp_bands_budget posture in
-- migration 0033_service_role_only_revokes.sql so the privilege model is
-- intentional in the migration history rather than implicit.
--
-- Idempotent: all creates are IF NOT EXISTS. Safe to re-run.
-- No data change.

-- 1. incident_alerts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_alerts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The watchdog signal name. Examples:
  --   cron:warmth-decay        — stale cron job (per-job)
  --   stripe-webhooks          — failed Stripe webhook events in last 24h
  --   ai-cost-hourly           — agent_logs.cost_cents > cap in last hour
  job_name        text        NOT NULL,
  severity        text        NOT NULL
                              CHECK (severity IN ('warn', 'crit')),
  -- Free-form "last seen value" — e.g. "$7.23/hour", "3 failed webhooks",
  -- "stale by 4h 12m". Captured at detection time so the recovery email
  -- can quote the worst-case value the owner needs to react to.
  last_seen_value text,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  -- NULL while the incident is open; stamped on transition to recovered.
  resolved_at     timestamptz,
  -- Last time the watchdog sent a digest mentioning THIS incident. The
  -- handler bumps this on open + on every 6h reminder so reminders pace
  -- predictably.
  last_email_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS posture (default-deny, service-role only) ────────────────────────
-- Mirror stripe_webhook_events: enable RLS without adding a policy, then
-- REVOKE the implicit table-level grants so a future migration that adds
-- `GRANT SELECT TO authenticated` doesn't quietly expose the table.
ALTER TABLE incident_alerts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.incident_alerts FROM anon;
REVOKE ALL ON public.incident_alerts FROM authenticated;

-- 3. Index ────────────────────────────────────────────────────────────────
-- The "is incident open for this job?" lookup is the load-bearing read on
-- every watchdog tick. Indexing (job_name, resolved_at) keeps that O(1)
-- while resolved_at IS NULL means the partial-index-shaped predicate
-- still matches efficiently.
CREATE INDEX IF NOT EXISTS idx_incident_alerts_job_open
  ON incident_alerts (job_name, resolved_at);
