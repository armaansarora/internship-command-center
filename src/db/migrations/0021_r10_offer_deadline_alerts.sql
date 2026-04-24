-- R10 post-mortem fix — offers need their own deadline_alerts_sent jsonb
-- so the R7 deadline-beat cron can fire t_24h / t_4h / t_0 alerts on
-- offers (not just applications). Mirrors applications.deadline_alerts_sent
-- exactly: keys are BeatKind, values are ISO timestamps of firing.
--
-- Surfaced by partner post-R10 audit: the R10 Proof line says "Deadline
-- alerts fire" but deadline-cron.ts only queried the applications table.
-- This column closes the dedupe side of the extension (cron change lands
-- in src/lib/situation/deadline-cron.ts in the same commit).

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS deadline_alerts_sent jsonb NOT NULL DEFAULT '{}'::jsonb;
