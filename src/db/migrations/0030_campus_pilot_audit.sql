-- 0030_campus_pilot_audit.sql
-- Campus Pilot inquiries — extend the audit_logs allow-list and relax the
-- user_id NOT NULL constraint so unauthenticated marketing leads can be
-- captured durably.
--
-- Why this migration exists
-- -------------------------
-- The /campus marketing page lets career-center contacts file a pilot
-- inquiry without signing in. The lead is delivered to the founder via
-- Resend AND persisted to `audit_logs` with event_type
-- `campus_pilot_inquiry` so we have a tamper-evident record even if the
-- email path fails. Two friction points block that flow today:
--
--   1. `audit_logs_event_type_check` (re-issued by 0029_trust_console_audit)
--      does NOT include `campus_pilot_inquiry` — the insert would be
--      rejected by the DB.
--   2. `audit_logs.user_id` is NOT NULL — there is no authenticated user
--      to attribute the row to.
--
-- Strategy:
--   - Drop the CHECK and re-add it with `campus_pilot_inquiry` appended.
--   - Drop the NOT NULL on user_id. The `audit_logs_self_read` RLS policy
--     (`auth.uid() = user_id`) naturally returns FALSE for NULL user_ids,
--     so marketing leads are still invisible to every authenticated user.
--     Service-role admin reads (the founder dashboard, future ops surface)
--     are unaffected.
--   - The user_id FK is unchanged: NULL trivially satisfies
--     `ON DELETE CASCADE`.
--
-- Privileges: audit_logs writes remain service-role-only (no INSERT policy
-- in src/db/schema.ts). Public-facing /campus inserts go through the
-- service-role admin client, identical to the existing waitlist signup
-- path. No additional REVOKE needed.
--
-- Rollback:
--   ALTER TABLE public.audit_logs ALTER COLUMN user_id SET NOT NULL;
--   ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_event_type_check;
--   ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_event_type_check
--     CHECK (event_type IN ( ...the 18 values listed in 0029... ));

ALTER TABLE public.audit_logs
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_event_type_check;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_event_type_check
  CHECK (event_type IN (
    'oauth_connected','oauth_disconnected',
    'data_exported','data_delete_requested','data_delete_canceled','data_hard_deleted',
    'agent_side_effect_email_sent','agent_side_effect_status_updated',
    'prompt_injection_detected',
    'subscription_created','subscription_canceled','subscription_updated',
    'login_succeeded','login_failed',
    'networking_opted_in','networking_revoked','networking_revoke_cascade_failed',
    'consent_version_stale_denial',
    'campus_pilot_inquiry'
  ));
