-- R6 — The Briefing Room (Floor 3)
-- Part 1 — columns added by drizzle push.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS voice_recording_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_recording_permanently_disabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drill_preferences JSONB NOT NULL
    DEFAULT '{"interruptFirmness":"firm","timerSeconds":90}'::jsonb;

-- Part 2 — Supabase Storage bucket and policies.
-- These statements must be run manually via psql against the target
-- environment. drizzle-kit push does NOT manage storage.* tables.
-- Verify with: SELECT id, public FROM storage.buckets WHERE id = 'interview-audio-private';
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-audio-private', 'interview-audio-private', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "r6_interview_audio_read_own" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'interview-audio-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NO insert/update/delete policy for authenticated role. All writes go
-- through admin client (service-role) in /api/briefing/audio-upload.
*/
