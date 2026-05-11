-- 0039_engagement_events_purchase.sql
-- Widens engagement_events.event_type and route_kind to include 'purchase'
-- and 'commerce'. Purely additive — preserves every prior value declared
-- in 0026 + 0027 + 0031.
--
-- Why this exists: GTM Plausible PR fires a server-side mirror of the
-- season_pass_purchased Plausible goal so the founder's conversion
-- dashboard still has a durable record when content blockers null-op the
-- client-side JS. The Stripe webhook handler writes this row on
-- `checkout.session.completed` for the Season Pass tier; the post-purchase
-- landing page fires the client goal in parallel.
--
-- The metadata column accepts the same allowlisted shape as other
-- event types (see ALLOWED_METADATA_KEYS in
-- src/lib/analytics/server-engagement.ts) — this migration only widens
-- the two CHECK constraints. REVOKE state from 0026 is preserved.
--
-- Rollback: drop the new constraints and re-add the 0031 versions.

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
    'user_return',
    'purchase'
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
    'retention',
    'commerce'
  ));

-- REVOKE state from 0026 is preserved; no GRANT changes are made here.
REVOKE ALL ON public.engagement_events FROM anon;
REVOKE ALL ON public.engagement_events FROM authenticated;
