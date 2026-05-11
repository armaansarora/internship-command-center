-- 0031_engagement_events_user_return.sql
-- Widens engagement_events.event_type and route_kind to include 'user_return'
-- and 'retention'. Purely additive — preserves every prior event_type value
-- declared in 0026 + 0027.
--
-- Why this exists: D1 / D7 / D30 retention queries in
-- src/lib/analytics/funnel-rollup.ts need a write-once-per-authed-page-load
-- return signal so the dashboard can run
-- `count(distinct user_id, date_trunc('day', created_at)) where event_type =
-- 'user_return'` against a window without scanning every floor_view event.
--
-- The middleware emits one `user_return` row per authenticated request that
-- already qualified as a `floor_view`. Per-day uniqueness is enforced at
-- READ time (the rollup query does the distinct), not at write time — the
-- table stays append-only and the writer stays fire-and-forget.
--
-- Allowlisted metadata keys are extended in
-- src/lib/analytics/server-engagement.ts; this migration only widens the
-- two CHECK constraints. REVOKE state from 0026 is preserved.
--
-- Rollback: drop the new constraints and re-add the 0027 versions.

-- 1. event_type ------------------------------------------------------------
ALTER TABLE public.engagement_events
  DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;

ALTER TABLE public.engagement_events
  ADD CONSTRAINT engagement_events_event_type_check
  CHECK (event_type IN (
    'marketing_view',
    'floor_view',
    'auth_gate_blocked',
    'activation_step',
    'user_return'
  ));

-- 2. route_kind ------------------------------------------------------------
ALTER TABLE public.engagement_events
  DROP CONSTRAINT IF EXISTS engagement_events_route_kind_check;

ALTER TABLE public.engagement_events
  ADD CONSTRAINT engagement_events_route_kind_check
  CHECK (route_kind IN (
    'marketing',
    'floor',
    'gate',
    'activation',
    'retention'
  ));

-- REVOKE state from 0026 is preserved; no GRANT changes are made here.
REVOKE ALL ON public.engagement_events FROM anon;
REVOKE ALL ON public.engagement_events FROM authenticated;
