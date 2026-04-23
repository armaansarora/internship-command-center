-- R1.3: Add match_score to applications for CRO Job Discovery scoring.
-- Stored so the war-table can sort by match (and the CROWhiteboard can
-- surface the top-scored candidates without re-computing vectors on read).

ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "match_score" numeric(4, 3);

CREATE INDEX IF NOT EXISTS "idx_apps_user_match_score"
  ON "applications" ("user_id", "match_score" DESC NULLS LAST);
