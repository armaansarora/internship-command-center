-- Migration 0018 — R8 The Rolodex Lounge (Floor 6)
--
-- Additive-only. No column drops. Safe to re-run (IF NOT EXISTS everywhere).
--
-- §7 Cross-user networking consent.  The match-candidates endpoint returns
-- 403 in R8; these columns are the gate for R8.x cross-user matching. The
-- consent_version bumps when the consent copy changes, forcing re-consent.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS networking_consent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS networking_revoked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS networking_consent_version INTEGER DEFAULT 0;

-- §8 Private note per contact — the sharpening detail. Never crosses any
-- outbound / AI / cross-user surface. P5 grep invariant enforces this
-- mechanically via an allowlist of files that may reference the column.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS private_note TEXT DEFAULT NULL;

-- §6 Contact embeddings for the warm-intro finder.  Content: name + title +
-- companyName (short form).  Queried against company_embeddings belonging
-- to the same user — purely intra-user.
CREATE TABLE IF NOT EXISTS contact_embeddings (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contact_embeddings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_embeddings'
      AND policyname = 'contact_embeddings_user_isolation'
  ) THEN
    CREATE POLICY contact_embeddings_user_isolation ON contact_embeddings
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_contact_embeddings_user
  ON contact_embeddings(user_id);

-- §7 Networking match index (empty in R8, schema committed for R8.x).  The
-- consent flow writes a row per active target company when the user opts in
-- and deletes them on revoke.  Cross-user matching (R8.x) reads this table
-- to find opted-in users targeting the same company.
CREATE TABLE IF NOT EXISTS networking_match_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE networking_match_index ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'networking_match_index'
      AND policyname = 'networking_match_index_user_isolation'
  ) THEN
    CREATE POLICY networking_match_index_user_isolation ON networking_match_index
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_networking_match_user
  ON networking_match_index(user_id);
