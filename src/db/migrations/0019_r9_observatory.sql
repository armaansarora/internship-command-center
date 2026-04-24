-- 0019_r9_observatory.sql
-- R9.6 — Rejection autopsy: per-application reflection rows so CFO can
-- aggregate patterns over time. One row max per application; chip
-- selections stored as text[], optional free text alongside.

CREATE TABLE IF NOT EXISTS rejection_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reasons text[] NOT NULL DEFAULT '{}',
  free_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rejection_reflections_app_unique UNIQUE(application_id)
);

ALTER TABLE rejection_reflections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rejection_reflections'
      AND policyname = 'rejection_reflections_user_isolation'
  ) THEN
    CREATE POLICY rejection_reflections_user_isolation ON rejection_reflections
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rejection_reflections_user_created
  ON rejection_reflections(user_id, created_at DESC);
