-- R4.1 — Lobby onboarding columns on user_profiles.
--
-- Adds the five columns that power the R4 first-visit experience:
--
--   arrival_played_at         — one-time cinematic gate (null = never played).
--   concierge_target_profile  — fast read of Otis's extracted profile.
--   concierge_completed_at    — opens the first-run Morning Briefing window.
--   first_briefing_shown      — idempotency flag for the bootstrap briefing.
--   floors_unlocked           — drives the Building Directory cross-section.
--
-- All columns are safe to add online: no rewrites, no defaults on large
-- tables beyond the boolean/text[] constants, no RLS changes (the existing
-- user_profiles_self_access policy covers new columns).

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "arrival_played_at" timestamptz;

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "concierge_target_profile" jsonb;

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "concierge_completed_at" timestamptz;

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "first_briefing_shown" boolean NOT NULL DEFAULT false;

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "floors_unlocked" text[] NOT NULL DEFAULT '{L}'::text[];
