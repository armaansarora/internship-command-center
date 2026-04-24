-- Migration 0022 — R11 Cross-user warm-intro matching scaffolding.
--
-- Additive-only. No column drops. Safe to re-run (IF NOT EXISTS everywhere,
-- policies wrapped in DO $$ BEGIN / IF NOT EXISTS in pg_policies). Pairs with
-- the R11.2 Drizzle schema additions in src/db/schema.ts.
--
-- This adds three tables + one column + one RPC:
--   1. match_candidate_index — per-user ranked candidate cache with TTL
--   2. match_events — append-only audit log of surfaced matches
--   3. match_rate_limits — bucketed hourly counter per user
--   4. user_profiles.match_index_last_rescan_at — rescan scheduler hint
--   5. bump_match_rate_limit(user_id, bucket, limit) — atomic UPSERT RPC
--
-- RLS isolates every row by `auth.uid() = user_id` on all four CRUD verbs.
-- The RPC is SECURITY DEFINER so route handlers can call it under their own
-- authenticated session without granting direct UPDATE on match_rate_limits.

-- 1. match_candidate_index ────────────────────────────────────────────────
-- Ranked counterparty cache per user. `invalidates_at` is the row's TTL
-- expiry; consumers filter on invalidates_at > now() and a sweeper cron
-- deletes expired rows. `counterparty_anon_key` is a stable hash scoped to
-- the owning user — never surfaces identity until intro is mutually accepted.
CREATE TABLE IF NOT EXISTS match_candidate_index (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  counterparty_anon_key   text NOT NULL,
  company_context         text NOT NULL,
  edge_strength           numeric(4,3) NOT NULL,
  inserted_at             timestamptz NOT NULL DEFAULT now(),
  invalidates_at          timestamptz NOT NULL
);

ALTER TABLE match_candidate_index ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_candidate_index'
      AND policyname = 'match_candidate_index_user_isolation'
  ) THEN
    CREATE POLICY match_candidate_index_user_isolation ON match_candidate_index
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_candidate_user_invalidates
  ON match_candidate_index(user_id, invalidates_at);

-- 2. match_events ─────────────────────────────────────────────────────────
-- Append-only audit trail of every candidate surfaced to this user. Used by
-- CFO analytics to attribute intros to specific match paths and by the Red
-- Team for privacy audits — a user can always enumerate what the matcher
-- showed them and why.
CREATE TABLE IF NOT EXISTS match_events (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  counterparty_anon_key   text NOT NULL,
  company_context         text NOT NULL,
  edge_strength           numeric(4,3) NOT NULL,
  fired_at                timestamptz NOT NULL DEFAULT now(),
  match_reason            text NOT NULL
);

ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_events'
      AND policyname = 'match_events_user_isolation'
  ) THEN
    CREATE POLICY match_events_user_isolation ON match_events
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_events_user_fired
  ON match_events(user_id, fired_at DESC);

-- 3. match_rate_limits ────────────────────────────────────────────────────
-- Bucketed per-user hourly counter. The composite PK `(user_id, hour_bucket)`
-- makes UPSERTs safe without extra locking. The `bump_match_rate_limit` RPC
-- below inserts-or-increments and returns (allowed, count). A cleanup cron
-- sweeps rows older than a day.
CREATE TABLE IF NOT EXISTS match_rate_limits (
  user_id       uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  hour_bucket   timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, hour_bucket)
);

ALTER TABLE match_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_rate_limits'
      AND policyname = 'match_rate_limits_user_isolation'
  ) THEN
    CREATE POLICY match_rate_limits_user_isolation ON match_rate_limits
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_rate_limits_bucket
  ON match_rate_limits(hour_bucket);

-- 4. user_profiles.match_index_last_rescan_at ────────────────────────────
-- Stamped each time the per-user candidate scan (re)builds this user's
-- ranked index. The scan scheduler compares this against the row-level
-- `invalidates_at` TTL to decide whether a rescan is due. Null = never run.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS match_index_last_rescan_at TIMESTAMPTZ DEFAULT NULL;

-- 5. bump_match_rate_limit RPC ────────────────────────────────────────────
-- Atomic UPSERT-and-increment that returns whether the caller is under the
-- limit. SECURITY DEFINER so route handlers can call it under their own
-- authenticated session without being granted direct UPDATE on the table.
-- Returns (allowed BOOLEAN, count INT): allowed = (cur <= p_limit).
CREATE OR REPLACE FUNCTION bump_match_rate_limit(
  p_user_id uuid,
  p_bucket timestamptz,
  p_limit int
)
RETURNS TABLE(allowed boolean, count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur int;
BEGIN
  INSERT INTO match_rate_limits (user_id, hour_bucket, count)
  VALUES (p_user_id, p_bucket, 1)
  ON CONFLICT (user_id, hour_bucket)
  DO UPDATE SET count = match_rate_limits.count + 1
  RETURNING match_rate_limits.count INTO cur;

  allowed := cur <= p_limit;
  count := cur;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION bump_match_rate_limit(uuid, timestamptz, int)
  TO authenticated;
