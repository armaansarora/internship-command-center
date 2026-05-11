-- 0031_user_profiles_school_name.sql
-- Add `school_name` to user_profiles to power the school-cohort density
-- signal surfaced by R13 (Differentiate council).
--
-- Why this migration exists
-- -------------------------
-- The Differentiate-council prior note flagged a missing density signal:
-- today a user cannot see "47 active members in your school cohort." The
-- signal is one of the moat anchors for the warm-intro network — cohort
-- visibility creates a network effect that compounds with every campus
-- pilot user that opts in.
--
-- Strategy
-- --------
-- 1. Add `school_name TEXT NULL` to user_profiles. NULL means the user
--    has not provided a school (intentional opt-in, default null on
--    every existing row).
-- 2. Create a partial btree index on (school_name) WHERE school_name IS
--    NOT NULL. The cohort-density query reads `COUNT(*) GROUP BY school_name`
--    filtered by `school_name = $1`. The partial index keeps the
--    NULL-heavy row population (early users) out of the b-tree.
-- 3. The cohort-density query NEVER projects another user's identity —
--    it returns only counts. RLS on user_profiles remains
--    `auth.uid() = id` which means an authenticated user can only read
--    their OWN row; the cohort COUNT is served via the admin client
--    inside the query helper (`getCohortDensity`), which is the same
--    pattern the cron + rebuild paths already use.
--
-- Privacy contract
-- ----------------
-- The `school_name` field is OPTIONAL. The cohort-density signal returns
-- only aggregate counts and excludes the calling user from the count
-- denominator (the calling user already knows about themselves). No
-- write path here mass-updates existing rows — every user explicitly
-- opts in to set the field.
--
-- Idempotent: every statement is guarded with IF NOT EXISTS or its
-- equivalent so re-running the migration is a no-op.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_user_profiles_school_name;
--   ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS school_name;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS school_name TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_school_name
  ON public.user_profiles (school_name)
  WHERE school_name IS NOT NULL;
