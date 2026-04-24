-- 0020_r10_negotiation_parlor.sql
-- R10 — The Negotiation Parlor (C-Suite annex, Floor 1).
-- Adds: offers table, company_comp_bands global cache, comp_bands_budget
-- counter, outreach_queue.type enum extensions, offers updated_at trigger.
-- Additive only. Safe to re-run.

-- 1. OFFERS ───────────────────────────────────────────────────────────────
-- Per-user offer ledger. `application_id` is nullable because offers can
-- arrive from companies the user never tracked (partner referrals, direct
-- recruiter pings). RLS isolates by `auth.uid() = user_id` on all four
-- CRUD verbs. `status` enum mirrors the offer lifecycle used by the Parlor
-- door-materialization gate and the comp-chart pin stacking.
CREATE TABLE IF NOT EXISTS offers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  application_id      uuid REFERENCES applications(id) ON DELETE SET NULL,
  company_name        text NOT NULL,
  role                text NOT NULL,
  level               text,
  location            text NOT NULL,
  base                integer NOT NULL,
  bonus               integer NOT NULL DEFAULT 0,
  equity              integer NOT NULL DEFAULT 0,
  sign_on             integer NOT NULL DEFAULT 0,
  housing             integer NOT NULL DEFAULT 0,
  start_date          date,
  benefits            jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at         timestamptz NOT NULL DEFAULT now(),
  deadline_at         timestamptz,
  status              text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','negotiating','accepted','declined','expired','withdrawn')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offers'
      AND policyname = 'offers_owner_select'
  ) THEN
    CREATE POLICY offers_owner_select ON offers
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offers'
      AND policyname = 'offers_owner_insert'
  ) THEN
    CREATE POLICY offers_owner_insert ON offers
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offers'
      AND policyname = 'offers_owner_update'
  ) THEN
    CREATE POLICY offers_owner_update ON offers
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offers'
      AND policyname = 'offers_owner_delete'
  ) THEN
    CREATE POLICY offers_owner_delete ON offers
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_offers_user_received
  ON offers(user_id, received_at DESC);

-- 2. COMPANY_COMP_BANDS (GLOBAL CACHE) ────────────────────────────────────
-- Shared across all authenticated users. Scraped from Levels.fyi via
-- Firecrawl with a 30-day TTL; `sample_size` records the number of data
-- points that backed the percentiles. RLS grants read-only access to
-- authenticated users; writes are service-role only.
CREATE TABLE IF NOT EXISTS company_comp_bands (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name_normalized   text NOT NULL,
  role                      text NOT NULL,
  location                  text NOT NULL,
  level                     text NOT NULL DEFAULT '',
  base_p25                  integer,
  base_p50                  integer,
  base_p75                  integer,
  bonus_p25                 integer,
  bonus_p50                 integer,
  bonus_p75                 integer,
  equity_p25                integer,
  equity_p50                integer,
  equity_p75                integer,
  sample_size               integer NOT NULL DEFAULT 0,
  source                    text NOT NULL DEFAULT 'levels.fyi',
  scraped_at                timestamptz NOT NULL DEFAULT now(),
  expires_at                timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CONSTRAINT comp_bands_unique UNIQUE (company_name_normalized, role, location, level)
);

ALTER TABLE company_comp_bands ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_comp_bands'
      AND policyname = 'comp_bands_read'
  ) THEN
    CREATE POLICY comp_bands_read ON company_comp_bands
      FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comp_bands_lookup
  ON company_comp_bands(company_name_normalized, role, location);

-- 3. COMP_BANDS_BUDGET ────────────────────────────────────────────────────
-- Monthly scrape-credit counter. Firecrawl free tier is 500 credits/month;
-- this table tracks how many we've spent in the current month so the
-- scraper can gate itself below the ceiling. No user access — service-role
-- only. RLS is enabled with no policies, which means authenticated clients
-- cannot read or write.
CREATE TABLE IF NOT EXISTS comp_bands_budget (
  month_key       text PRIMARY KEY,
  scrape_count    integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comp_bands_budget ENABLE ROW LEVEL SECURITY;
-- No user access; service role only.

-- 4. OUTREACH_QUEUE.type enum — add 'negotiation', 'reference_request' ────
-- The type column is a plain text column in the base migration; the enum
-- is enforced at the Drizzle schema layer. R10 introduces the first
-- SQL-level CHECK constraint for this column so negotiation and reference
-- request drafts have their own typed queue rows with the same send-hold
-- semantics (send_after column) R7 already wires in.
ALTER TABLE outreach_queue DROP CONSTRAINT IF EXISTS outreach_queue_type_check;
ALTER TABLE outreach_queue
  ADD CONSTRAINT outreach_queue_type_check
  CHECK (type IN (
    'cold_email','follow_up','thank_you','networking','cover_letter_send',
    'negotiation','reference_request'
  ));

-- 5. offers updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_updated_at ON offers;
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_offers_updated_at();
