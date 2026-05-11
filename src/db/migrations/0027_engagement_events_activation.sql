-- 0027_engagement_events_activation.sql
-- Extends event_type to include 'activation_step' and route_kind to include
-- 'activation' -- see Fix #PR1 (5-minute activation gauntlet).
--
-- This migration is purely additive: it widens the two CHECK constraints on
-- public.engagement_events without changing any column types, indexes, RLS,
-- or grants. Existing rows are unaffected because every legacy value
-- ('marketing_view', 'floor_view', 'auth_gate_blocked' / 'marketing',
-- 'floor', 'gate') is preserved in the new constraint set.
--
-- Constraint names: 0026 declared the CHECKs inline, so Postgres auto-named
-- them `<table>_<column>_check`. We drop those defensively (IF EXISTS) and
-- re-add named constraints so future migrations have a stable handle.
--
-- Rollback: re-execute the original 0026 CHECK definitions after dropping
-- the new named constraints.
--
-- Privacy/security: REVOKE state from 0026 is untouched. Service-role-only
-- writes still apply.

-- 1. event_type ------------------------------------------------------------
ALTER TABLE public.engagement_events
  DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;

ALTER TABLE public.engagement_events
  ADD CONSTRAINT engagement_events_event_type_check
  CHECK (event_type IN (
    'marketing_view',
    'floor_view',
    'auth_gate_blocked',
    'activation_step'
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
    'activation'
  ));

-- REVOKE state from 0026 is preserved; no GRANT changes are made here.
REVOKE ALL ON public.engagement_events FROM anon;
REVOKE ALL ON public.engagement_events FROM authenticated;
