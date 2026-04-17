-- ================================================================
-- Progression integrity hardening
-- Prevent duplicate milestone unlock rows under concurrent requests.
-- Safe to run multiple times.
-- ================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_progression_user_milestone
  ON public.progression_milestones (user_id, milestone);
