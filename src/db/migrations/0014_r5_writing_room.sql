-- =============================================================================
-- R5.1 — The Writing Room: base_resumes table + private resumes bucket.
--
-- `base_resumes` rows hold metadata + a plain-text cache of uploaded PDF base
-- resumes. The binary payload itself lives in Supabase Storage's `resumes`
-- bucket (private, service-role only, signed URLs for reads).
--
-- **Two-part migration.** The table portion runs through drizzle-kit push.
-- The storage.buckets INSERT + policy must be applied manually via `psql`
-- against the target environment, mirroring the 0009_exports_bucket.sql
-- pattern. Non-negotiable per the R5 brief: the bucket is *private*; users
-- never see a public URL for their resume — only a short-lived signed URL
-- minted by the service-role admin client.
--
-- File size limit: 10 MB. Generous for a PDF resume (most are ≤1 MB), tight
-- enough to cap abuse. Parsing caps (max 50 pages, max 500KB parsed text) are
-- enforced in application code — see src/lib/resumes/parse.ts.
-- =============================================================================

-- --- Part 1: table (drizzle-kit push applies this) --------------------------

CREATE TABLE IF NOT EXISTS base_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  file_size_bytes integer NOT NULL,
  parsed_text text NOT NULL,
  page_count integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE base_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "base_resumes_user_isolation" ON base_resumes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_base_resumes_user_active
  ON base_resumes(user_id, is_active);

-- --- Part 2: bucket (operator-run via `psql`) -------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('resumes', 'resumes', false, 10485760)  -- 10 MB
ON CONFLICT (id) DO NOTHING;

-- Service-role bypasses RLS by default, but being explicit keeps intent
-- readable in the DB. No policy granted to `authenticated` or `anon` —
-- readers go through signed URLs minted by the admin client.
CREATE POLICY "resumes_service_role_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'resumes')
  WITH CHECK (bucket_id = 'resumes');
