-- =============================================================================
-- Migration 0002 — Composite uniques, missing upsert uniques, hot-path indexes
--
-- Source: audit/03-database.md §2.3 (Unique Constraint Gaps), §2.2 (Index Gaps)
--
-- Why this matters:
--   * `emails.gmail_id` and `calendar_events.google_event_id` were globally
--     unique. If two users share a gmail/calendar event id (forwards, family
--     accounts) the second writer overwrites or fails. Audit flags this as
--     CROSS-USER DATA CORRUPTION (HIGH).
--   * Several queries call `.upsert(..., { onConflict: "..." })` against
--     columns that have NO unique index. Supabase silently inserts duplicates
--     in that situation. Affected: daily_snapshots, company_embeddings,
--     job_embeddings, progression_milestones.
--   * Hot-path queries (`getFollowUpsDue`, `getCoolingContacts`,
--     `getRecentEmails`, `searchCompaniesByName`, CFO funnel,
--     CEO recent activity, Stripe webhook lookup) lacked covering indexes.
--   * Trigram (`pg_trgm`) extension is required for the `companies.name`
--     `ilike` lookup that `searchCompaniesByName` performs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Required extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 2. emails.gmail_id  →  UNIQUE (user_id, gmail_id)
-- ---------------------------------------------------------------------------
ALTER TABLE "emails"
  DROP CONSTRAINT IF EXISTS "emails_gmail_id_unique";
--> statement-breakpoint
ALTER TABLE "emails"
  ADD CONSTRAINT "emails_user_gmail_id_unique" UNIQUE ("user_id", "gmail_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. calendar_events.google_event_id  →  UNIQUE (user_id, google_event_id)
-- ---------------------------------------------------------------------------
ALTER TABLE "calendar_events"
  DROP CONSTRAINT IF EXISTS "calendar_events_google_event_id_unique";
--> statement-breakpoint
ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_user_event_id_unique"
  UNIQUE ("user_id", "google_event_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. daily_snapshots — required by `onConflict: "user_id,date"` in
--    daily-snapshots-rest.ts:104 and cron/briefing/route.ts:145
-- ---------------------------------------------------------------------------
ALTER TABLE "daily_snapshots"
  ADD CONSTRAINT "daily_snapshots_user_date_unique" UNIQUE ("user_id", "date");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. company_embeddings — needed for atomic upsert
--    (current code DELETE-then-INSERT in embeddings-rest.ts:150)
-- ---------------------------------------------------------------------------
ALTER TABLE "company_embeddings"
  ADD CONSTRAINT "company_embeddings_user_company_unique"
  UNIQUE ("user_id", "company_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. job_embeddings — same atomic-upsert reason (one embedding per app)
-- ---------------------------------------------------------------------------
ALTER TABLE "job_embeddings"
  ADD CONSTRAINT "job_embeddings_user_application_unique"
  UNIQUE ("user_id", "application_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 7. progression_milestones — prevent duplicate unlocks under concurrent
--    `checkAndUnlockMilestones` runs (engine.ts:121 inserts without conflict
--    handling).
-- ---------------------------------------------------------------------------
ALTER TABLE "progression_milestones"
  ADD CONSTRAINT "progression_milestones_user_milestone_unique"
  UNIQUE ("user_id", "milestone");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 8. Hot-path indexes
-- ---------------------------------------------------------------------------
-- applications: stale/follow-up sort (`getFollowUpsDue` filters
-- last_activity_at < threshold; CFO orders by it).
CREATE INDEX IF NOT EXISTS "idx_apps_user_last_activity"
  ON "applications" USING btree ("user_id", "last_activity_at" DESC NULLS LAST);
--> statement-breakpoint

-- contacts: warmth queries depend on last_contact_at, not the stored warmth
-- column (see contacts-rest.ts:74). Composite makes both filter and sort
-- efficient.
CREATE INDEX IF NOT EXISTS "idx_contacts_user_last_contact"
  ON "contacts" USING btree ("user_id", "last_contact_at" DESC NULLS LAST);
--> statement-breakpoint

-- emails: the recent-email feed and cron briefing both order by received_at
-- desc; covering index lets PostgREST stream in index order.
CREATE INDEX IF NOT EXISTS "idx_emails_user_received"
  ON "emails" USING btree ("user_id", "received_at" DESC NULLS LAST);
--> statement-breakpoint

-- companies: `searchCompaniesByName` (ilike '%q%') was a sequential scan
-- without a trigram GIN index.
CREATE INDEX IF NOT EXISTS "idx_companies_name_trgm"
  ON "companies" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
