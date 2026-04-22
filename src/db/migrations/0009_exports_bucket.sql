-- =============================================================================
-- R0.6 — Supabase Storage bucket for user-data export archives.
--
-- This migration is intentionally NOT run via drizzle-kit push. It is
-- committed as documentation + operator-run SQL. Apply it manually via
-- `psql` against the Supabase database when provisioning the feature in a
-- new environment.
--
-- The bucket is private: only the service-role policy below grants read or
-- write access. The app mints 7-day signed URLs via
-- `admin.storage.from('exports').createSignedUrl(...)` so end users fetch
-- their archive without touching a bearer credential.
--
-- File size limit: 100 MB per object. Generous enough for a year of pipeline
-- + email history while still capping a runaway export (e.g., a bug that
-- inflates counts) from consuming unbounded storage.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exports', 'exports', false, 104857600)  -- 100 MB
ON CONFLICT (id) DO NOTHING;

-- Service-role bypasses RLS by default, but being explicit here keeps the
-- intent readable in the DB. No policy granted to `authenticated` or `anon`
-- — readers must go through signed URLs.
CREATE POLICY "exports_service_role_all"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'exports')
  WITH CHECK (bucket_id = 'exports');
