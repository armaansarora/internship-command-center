# SCHEMA DRAFT — Postgres Translation of Old SQLite Schema
## Ready to copy into `src/db/schema.ts` during Phase 0

**Source:** `/old-repo-audit/src/db/schema.ts` (517 LOC, 15 tables)
**Changes:** SQLite→Postgres types, `userId` on every table, pgvector columns, RLS policies, timestamps as `timestamp` not `text`

---

## Key Migration Decisions

| SQLite | Postgres | Reason |
|---|---|---|
| `text('id')` with random hex | `uuid('id').primaryKey().defaultRandom()` | Native UUID, better indexing |
| `text('created_at')` ISO string | `timestamp('created_at', { withTimezone: true }).defaultNow()` | Native timestamp, query operators |
| `integer('is_read', { mode: 'boolean' })` | `boolean('is_read').default(false)` | Native boolean |
| `real('cost_cents')` | `numeric('cost_cents', { precision: 10, scale: 2 })` | Precise currency |
| `blob('embedding')` | `vector('embedding', { dimensions: 1536 })` | pgvector native type |
| `text('key_people', { mode: 'json' })` | `jsonb('key_people')` | Native JSONB with operators |
| No `userId` | `uuid('user_id').notNull()` on every table | Multi-tenant RLS |

---

## Schema (15 tables + 1 new `users` profile table)

```ts
import {
  pgTable, uuid, text, integer, boolean, timestamp,
  numeric, jsonb, index, foreignKey, pgPolicy, vector,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

// ---------------------------------------------------------------------------
// RLS helper: factory function (each table needs a unique policy name in PG)
// ---------------------------------------------------------------------------
const userIsolation = (tableName: string) =>
  pgPolicy(`${tableName}_user_isolation`, {
    for: 'all',
    to: 'authenticated',
    using: sql`auth.uid() = user_id`,
    withCheck: sql`auth.uid() = user_id`,
  });

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  // NOTE: Postgres does NOT auto-update updated_at. Two options:
  // 1. Application-level: set updatedAt in every Drizzle update call
  // 2. DB trigger (recommended): run this SQL after schema push:
  //    CREATE OR REPLACE FUNCTION update_updated_at()
  //    RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
  //    Then for each table: CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table}
  //    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
};

// ===========================================================================
// 0. USER PROFILES (synced from Supabase Auth)
// ===========================================================================
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone').default('America/New_York'),
  onboardingStep: integer('onboarding_step').default(0),
  progressionLevel: integer('progression_level').default(0), // building progression
  googleTokens: jsonb('google_tokens'), // encrypted Gmail/Calendar OAuth tokens
  preferences: jsonb('preferences'), // notification prefs, daily briefing time, etc.
  stripeCustomerId: text('stripe_customer_id'),
  subscriptionTier: text('subscription_tier', {
    enum: ['free', 'pro', 'team'],
  }).default('free'),
  lastFloorVisited: text('last_floor_visited').default('PH'),
  ...timestamps,
}, () => [
  // userProfiles uses `id` directly (not user_id) since id IS the auth.users.id
  pgPolicy('user_profiles_self_access', {
    for: 'all',
    to: 'authenticated',
    using: sql`auth.uid() = id`,
    withCheck: sql`auth.uid() = id`,
  }),
]);

// ===========================================================================
// 1. COMPANIES
// ===========================================================================
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  domain: text('domain'),
  industry: text('industry'),
  sector: text('sector'),
  size: text('size', { enum: ['startup', 'mid', 'large', 'enterprise'] }),
  headquarters: text('headquarters'),
  description: text('description'),
  cultureSummary: text('culture_summary'),
  recentNews: text('recent_news'),
  financialsSummary: text('financials_summary'),
  researchFreshness: timestamp('research_freshness', { withTimezone: true }),
  tier: integer('tier'),
  logoUrl: text('logo_url'),
  careersUrl: text('careers_url'),
  linkedinUrl: text('linkedin_url'),
  glassdoorUrl: text('glassdoor_url'),
  secCik: text('sec_cik'),
  keyPeople: jsonb('key_people'),
  internshipIntel: text('internship_intel'),
  yourConnections: jsonb('your_connections'),
  ...timestamps,
}, (table) => [
  userIsolation('companies'),
  index('idx_companies_user_tier').on(table.userId, table.tier),
]);

// ===========================================================================
// 2. APPLICATIONS
// ===========================================================================
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  role: text('role').notNull(),
  url: text('url'),
  status: text('status', {
    enum: ['discovered', 'applied', 'screening', 'interview_scheduled', 'interviewing',
           'under_review', 'offer', 'accepted', 'rejected', 'withdrawn'],
  }).notNull().default('discovered'),
  tier: integer('tier'),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  source: text('source'),
  notes: text('notes'),
  sector: text('sector'),
  contactId: uuid('contact_id'),  // FK added after contacts table
  salary: text('salary'),
  location: text('location'),
  ...timestamps,
}, (table) => [
  userIsolation('applications'),
  index('idx_apps_user_status').on(table.userId, table.status),
  index('idx_apps_user_company').on(table.userId, table.companyId),
  index('idx_apps_created').on(table.createdAt),
]);

// ===========================================================================
// 3. CONTACTS
// ===========================================================================
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email'),
  title: text('title'),
  linkedinUrl: text('linkedin_url'),
  relationship: text('relationship', {
    enum: ['alumni', 'recruiter', 'referral', 'cold', 'warm_intro'],
  }),
  phone: text('phone'),
  introducedBy: text('introduced_by'),
  warmth: integer('warmth').default(50), // 0-100 scale
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  notes: text('notes'),
  source: text('source', { enum: ['apollo', 'hunter', 'pdl', 'manual'] }),
  ...timestamps,
}, (table) => [
  userIsolation('contacts'),
  index('idx_contacts_user_company').on(table.userId, table.companyId),
  index('idx_contacts_warmth').on(table.warmth),
]);

// ===========================================================================
// 4. EMAILS
// ===========================================================================
export const emails = pgTable('emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  gmailId: text('gmail_id').unique(),
  threadId: text('thread_id'),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  fromAddress: text('from_address'),
  toAddress: text('to_address'),
  subject: text('subject'),
  snippet: text('snippet'),
  bodyText: text('body_text'),
  classification: text('classification', {
    enum: ['interview_invite', 'rejection', 'info_request', 'follow_up_needed', 'offer', 'newsletter', 'other'],
  }),
  urgency: text('urgency', { enum: ['high', 'medium', 'low'] }),
  suggestedAction: text('suggested_action'),
  isRead: boolean('is_read').default(false),
  isProcessed: boolean('is_processed').default(false),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation('emails'),
  index('idx_emails_gmail_id').on(table.gmailId),
  index('idx_emails_user_class').on(table.userId, table.classification),
]);

// ===========================================================================
// 5. DOCUMENTS (cover letters, prep packets, debriefs)
// ===========================================================================
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['cover_letter', 'resume_tailored', 'prep_packet', 'debrief'] }),
  title: text('title'),
  content: text('content'),
  version: integer('version').default(1),
  isActive: boolean('is_active').default(false),
  parentId: uuid('parent_id'), // self-reference for version chains
  generatedBy: text('generated_by'), // which agent created it
  ...timestamps,
}, (table) => [
  userIsolation('documents'),
  index('idx_docs_user_app').on(table.userId, table.applicationId),
  index('idx_docs_type').on(table.type),
]);

// ===========================================================================
// 6. INTERVIEWS
// ===========================================================================
export const interviews = pgTable('interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  round: text('round'),
  format: text('format'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  durationMinutes: integer('duration_minutes').default(60),
  location: text('location'),
  interviewerName: text('interviewer_name'),
  interviewerTitle: text('interviewer_title'),
  interviewerLinkedin: text('interviewer_linkedin'),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'] }),
  prepPacketId: uuid('prep_packet_id').references(() => documents.id, { onDelete: 'set null' }),
  debriefId: uuid('debrief_id').references(() => documents.id, { onDelete: 'set null' }),
  calendarEventId: text('calendar_event_id'),
  notes: text('notes'),
  ...timestamps,
}, (table) => [
  userIsolation('interviews'),
  index('idx_interviews_user_sched').on(table.userId, table.scheduledAt),
]);

// ===========================================================================
// 7. CALENDAR EVENTS
// ===========================================================================
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  googleEventId: text('google_event_id').unique(),
  title: text('title'),
  description: text('description'),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  location: text('location'),
  interviewId: uuid('interview_id').references(() => interviews.id, { onDelete: 'set null' }),
  source: text('source').default('google'),
  ...timestamps,
}, (table) => [
  userIsolation('calendar_events'),
  index('idx_cal_user_start').on(table.userId, table.startAt),
]);

// ===========================================================================
// 8. OUTREACH QUEUE
// ===========================================================================
export const outreachQueue = pgTable('outreach_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  type: text('type', {
    enum: ['cold_email', 'follow_up', 'thank_you', 'networking', 'cover_letter_send'],
  }),
  subject: text('subject'),
  body: text('body'),
  status: text('status', {
    enum: ['pending_approval', 'approved', 'sent', 'rejected', 'expired'],
  }).notNull().default('pending_approval'),
  generatedBy: text('generated_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  resendMessageId: text('resend_message_id'),
  ...timestamps,
}, (table) => [
  userIsolation('outreach_queue'),
  index('idx_outreach_user_status').on(table.userId, table.status),
]);

// ===========================================================================
// 9. NOTIFICATIONS
// ===========================================================================
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  type: text('type'),
  priority: text('priority', { enum: ['critical', 'high', 'medium', 'low'] }),
  title: text('title'),
  body: text('body'),
  sourceAgent: text('source_agent'),
  sourceEntityId: uuid('source_entity_id'),
  sourceEntityType: text('source_entity_type'),
  channels: jsonb('channels'),
  isRead: boolean('is_read').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  actions: jsonb('actions'),
  ...timestamps,
}, (table) => [
  userIsolation('notifications'),
  index('idx_notif_user_read').on(table.userId, table.isRead),
]);

// ===========================================================================
// 10. AGENT LOGS
// ===========================================================================
export const agentLogs = pgTable('agent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  agent: text('agent'), // CEO, CRO, CIO, etc.
  worker: text('worker'),
  action: text('action'),
  status: text('status', { enum: ['running', 'completed', 'failed', 'cancelled'] }),
  inputSummary: text('input_summary'),
  outputSummary: text('output_summary'),
  error: text('error'),
  tokensUsed: integer('tokens_used'),
  costCents: numeric('cost_cents', { precision: 10, scale: 2 }),
  durationMs: integer('duration_ms'),
  inngestRunId: text('inngest_run_id'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation('agent_logs'),
  index('idx_logs_user_agent').on(table.userId, table.agent),
]);

// ===========================================================================
// 11. AGENT MEMORY (pgvector)
// ===========================================================================
export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  agent: text('agent'),
  category: text('category', { enum: ['preference', 'pattern', 'fact', 'feedback'] }),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }),
  importance: numeric('importance', { precision: 3, scale: 2 }).default('0.50'),
  accessCount: integer('access_count').default(0),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation('agent_memory'),
  // HNSW index for fast similarity search — create via raw SQL after push:
  // CREATE INDEX idx_agent_memory_embedding ON agent_memory
  //   USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
]);

// ===========================================================================
// 12. DAILY SNAPSHOTS
// ===========================================================================
export const dailySnapshots = pgTable('daily_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // 'YYYY-MM-DD'
  totalApplications: integer('total_applications'),
  activePipeline: integer('active_pipeline'),
  interviewsScheduled: integer('interviews_scheduled'),
  offers: integer('offers'),
  rejections: integer('rejections'),
  emailsProcessed: integer('emails_processed'),
  agentsRuns: integer('agents_runs'),
  totalCostCents: integer('total_cost_cents'),
  ...timestamps,
}, (table) => [
  userIsolation('daily_snapshots'),
  index('idx_snap_user_date').on(table.userId, table.date),
]);

// ===========================================================================
// 13. COMPANY EMBEDDINGS (pgvector)
// ===========================================================================
export const companyEmbeddings = pgTable('company_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }),
  ...timestamps,
}, (table) => [
  userIsolation('company_embeddings'),
  // HNSW index: CREATE INDEX idx_company_emb ON company_embeddings
  //   USING hnsw (embedding vector_cosine_ops);
]);

// ===========================================================================
// 14. JOB EMBEDDINGS (pgvector)
// ===========================================================================
export const jobEmbeddings = pgTable('job_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }),
  ...timestamps,
}, (table) => [
  userIsolation('job_embeddings'),
  // HNSW index: CREATE INDEX idx_job_emb ON job_embeddings
  //   USING hnsw (embedding vector_cosine_ops);
]);

// ===========================================================================
// 15. PROGRESSION MILESTONES (building unlock system)
// ===========================================================================
export const progressionMilestones = pgTable('progression_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  milestone: text('milestone').notNull(), // 'gmail_connected', 'first_10_apps', 'first_interview', etc.
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow(),
  floorUnlocked: text('floor_unlocked'), // which floor visual upgrade this triggers
  ...timestamps,
}, (table) => [
  userIsolation('progression_milestones'),
]);
```

---

## Post-Push SQL (run after `drizzle-kit push`)

```sql
-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Apply to all tables (repeat for each):
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... (apply to all 16 tables)

-- 3. HNSW vector indexes for similarity search
CREATE INDEX idx_agent_memory_embedding ON agent_memory
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_company_emb ON company_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_job_emb ON job_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

---

## Table Count: 16 (15 ported + 1 new `userProfiles`)

The `progressionMilestones` table is new — supports the building progression system from VISION-SPEC.md.

## pgvector Setup Requirement
Before running migrations, enable pgvector in Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
This can be done via Supabase dashboard → Database → Extensions.
