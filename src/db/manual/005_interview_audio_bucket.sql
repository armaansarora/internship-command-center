-- R6 — The Briefing Room (Floor 3)
-- Part 2 of migration 0016: Supabase Storage bucket + RLS policies.
-- Drizzle Kit does not manage storage.* tables — run this file manually
-- via Supabase Dashboard → SQL Editor after 0016_r6_briefing_room.sql.
--
-- Idempotent. Re-running is safe.
-- Verify success:
--   SELECT id, public FROM storage.buckets WHERE id = 'interview-audio-private';
--   SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
--     AND policyname = 'r6_interview_audio_read_own';

INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-audio-private', 'interview-audio-private', false)
ON CONFLICT (id) DO NOTHING;

-- Read own folder only. Objects are stored at path = '<uid>/<anything>';
-- storage.foldername()[1] pulls the first path segment.
DROP POLICY IF EXISTS "r6_interview_audio_read_own" ON storage.objects;
CREATE POLICY "r6_interview_audio_read_own" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'interview-audio-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NO insert/update/delete policy for the authenticated role. All writes go
-- through the admin (service-role) client in /api/briefing/audio-upload.
-- This is the three-layer enforcement: UI opt-in + server 403/410 + storage RLS.
