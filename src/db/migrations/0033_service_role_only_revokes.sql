-- 0033_service_role_only_revokes.sql
-- RiskCompliance — General #1 (RLS coverage).
--
-- Two tables in the schema rely on RLS-default-deny (RLS enabled with no
-- policy) to keep authenticated clients out:
--
--   - stripe_webhook_events  — webhook idempotency cache. Server-only.
--   - comp_bands_budget      — Firecrawl monthly scrape-credit counter.
--
-- Default-deny is technically sufficient today (no policy → no rows for
-- authenticated/anon), but it leaves room for a future `GRANT SELECT
-- ... TO authenticated` to quietly expose the table without alarm.
-- This migration adds an explicit REVOKE so the posture is intentional
-- in the migration history. It mirrors the pattern already used by
-- `engagement_events` in migration 0026 and the deny-policy used by
-- `waitlist_signups` in 0023.
--
-- Idempotent: REVOKE on already-revoked privileges is a no-op.
-- No data change.  Safe to re-run.
--
-- Rollback (NOT recommended):
--   GRANT SELECT ON public.stripe_webhook_events TO authenticated, anon;
--   GRANT SELECT ON public.comp_bands_budget       TO authenticated, anon;

-- ─────────────────────────── stripe_webhook_events ─────────────────────
-- Service-role only.  Webhook idempotency rows must never be readable by
-- clients (they would leak Stripe event ids and processing state, which
-- a malicious client could use to replay or skip events).
REVOKE ALL ON public.stripe_webhook_events FROM anon;
REVOKE ALL ON public.stripe_webhook_events FROM authenticated;

-- ─────────────────────────── comp_bands_budget ─────────────────────────
-- Service-role only.  Exposing the counter would let any client probe
-- how close we are to Firecrawl's monthly cap; not catastrophic but
-- pointless to share.  REVOKE matches the engagement_events posture.
REVOKE ALL ON public.comp_bands_budget FROM anon;
REVOKE ALL ON public.comp_bands_budget FROM authenticated;
