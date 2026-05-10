-- 0026_engagement_events.sql
-- Server-side engagement events sink (Fix #3).
--
-- Operational write-only table populated from middleware via service-role
-- client. Survives content blockers that null-op Plausible. NEVER queried at
-- runtime from app code -- there is no Drizzle schema entry, and there is no
-- SELECT policy. Reads are gated by REVOKE so even a future `.select()` bug
-- cannot return rows to anon/authenticated clients.
--
-- Privacy: stores only pathname (no query string), route_kind enum, floor,
-- and a small allowlisted metadata jsonb. No IP, no user-agent, no headers.
--
-- Rollback: DROP TABLE IF EXISTS public.engagement_events;

CREATE TABLE IF NOT EXISTS public.engagement_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL    DEFAULT now(),
  event_type   text        NOT NULL    CHECK (event_type IN
                 ('marketing_view', 'floor_view', 'auth_gate_blocked')),
  user_id      uuid        NULL        REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  pathname     text        NOT NULL    CHECK (length(pathname) <= 256),
  route_kind   text        NOT NULL    CHECK (route_kind IN
                 ('marketing', 'floor', 'gate')),
  floor        text        NULL        CHECK (length(floor) <= 32),
  metadata     jsonb       NOT NULL    DEFAULT '{}'::jsonb
);

ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. We deliberately add NO policy for any other role.
-- Combined with REVOKE below this makes the table service-role-only by
-- construction -- no policy misconfiguration can leak rows to clients.
REVOKE ALL ON public.engagement_events FROM anon;
REVOKE ALL ON public.engagement_events FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_engagement_events_event_created
  ON public.engagement_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_events_user_created
  ON public.engagement_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
