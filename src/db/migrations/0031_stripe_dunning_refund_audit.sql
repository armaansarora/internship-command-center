-- 0031_stripe_dunning_refund_audit.sql
-- Monetize council / dunning + refund hardening — extend the audit_logs
-- allow-list so the Stripe webhook can emit `payment_failed` and
-- `refund_issued` rows.
--
-- Why this migration exists
-- -------------------------
-- Prior to this change the Stripe webhook ignored `invoice.payment_failed`
-- and `charge.refunded` events entirely. The handler is now wired to emit
-- audit rows for both, but the `audit_logs_event_type_check` CHECK
-- constraint (last extended by 0030_campus_pilot_audit) does not list the
-- new event types — any insert would be rejected at the DB layer.
--
-- Strategy: drop the CHECK and re-add it with `payment_failed` and
-- `refund_issued` appended to the closed set. Idempotent guarded.
--
-- Privileges: audit_logs writes remain service-role-only — the Stripe
-- webhook handler already uses `getSupabaseAdmin()`. No additional REVOKE.
--
-- Rollback:
--   ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_event_type_check;
--   ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_event_type_check
--     CHECK (event_type IN ( ...the 19 values listed in 0030... ));

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
    'campus_pilot_inquiry',
    'payment_failed','refund_issued'
  ));
