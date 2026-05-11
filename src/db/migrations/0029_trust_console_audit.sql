-- 0029_trust_console_audit.sql
-- Trust Console / PR4 — networking-consent lifecycle audit event types.
--
-- Why this migration exists
-- -------------------------
-- The original Codex-RiskCompliance review flagged that the privacy Trust
-- Console relies on `audit_logs` rows that the application cannot currently
-- write. The `audit_logs_event_type_check` CHECK constraint added by
-- migration 0007 pins `event_type` to a closed set of strings. Inserting
-- any unknown value fails at the DB layer, so the four networking-consent
-- events below were silently rejected before this change:
--
--   - networking_opted_in              fires when the user re-consents
--   - networking_revoked               fires when the revoke cascade succeeds
--   - networking_revoke_cascade_failed fires when the cascade short-circuits
--   - consent_version_stale_denial     fires when assertConsented rejects
--                                       a request because the user is on an
--                                       older consent copy and needs to
--                                       re-consent
--
-- Strategy: drop the old CHECK constraint and re-add it with the extended
-- allow-list. Both operations are idempotent guarded so the migration is
-- safely re-runnable.
--
-- Indexes: `idx_audit_logs_event_type_user_created` accelerates the Trust
-- Console timeline query (`WHERE event_type IN (...) AND user_id = $1 ORDER
-- BY created_at DESC`). The existing 0007 indexes
-- (`idx_audit_logs_user_created`, `idx_audit_logs_event_type`) cover the
-- export and admin paths but neither carries both columns in the order the
-- Trust Console needs.
--
-- Privileges: audit_logs writes are already service-role-only by
-- construction (no INSERT/UPDATE/DELETE policy in src/db/schema.ts; reads
-- gated to `auth.uid() = user_id`). No additional REVOKE needed here.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_audit_logs_event_type_user_created;
--   ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_event_type_check;
--   ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_event_type_check
--     CHECK (event_type IN ( ...original 14 values... ));

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
    'consent_version_stale_denial'
  ));

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type_user_created
  ON public.audit_logs (event_type, user_id, created_at DESC);
