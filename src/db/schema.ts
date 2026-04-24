import {
  pgTable, uuid, text, integer, boolean, timestamp, date,
  numeric, jsonb, index, pgPolicy, vector, unique, primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// RLS helper: factory function (each table needs a unique policy name in PG)
// ---------------------------------------------------------------------------
const userIsolation = (tableName: string) =>
  pgPolicy(`${tableName}_user_isolation`, {
    for: "all",
    to: "authenticated",
    using: sql`auth.uid() = user_id`,
    withCheck: sql`auth.uid() = user_id`,
  });

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

// ===========================================================================
// 0. USER PROFILES (synced from Supabase Auth)
// ===========================================================================
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").default("America/New_York"),
  onboardingStep: integer("onboarding_step").default(0),
  progressionLevel: integer("progression_level").default(0),
  googleTokens: jsonb("google_tokens"),
  preferences: jsonb("preferences"),
  stripeCustomerId: text("stripe_customer_id"),
  // R0.6 — full user-data export queue. `idle` is the resting state;
  // POST /api/account/export flips to `queued`; the cron worker transitions
  // through `running` → `delivered` (or `failed`). `dataExportRequestedAt`
  // is stamped at queue time; `dataExportLastDeliveredAt` is stamped after
  // a successful email hand-off.
  dataExportStatus: text("data_export_status", {
    enum: ["idle", "queued", "running", "delivered", "failed"],
  }).default("idle"),
  dataExportRequestedAt: timestamp("data_export_requested_at", { withTimezone: true }),
  dataExportLastDeliveredAt: timestamp("data_export_last_delivered_at", { withTimezone: true }),
  // R0.7 — account deletion. `POST /api/account/delete` stamps now(); the
  // cron purge-sweeper hard-deletes rows whose `deleted_at` is older than
  // 30 days. Null means the account is live; non-null means the 30-day
  // grace window is ticking down to a hard delete.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  subscriptionTier: text("subscription_tier", {
    enum: ["free", "pro", "team"],
  }).default("free"),
  lastFloorVisited: text("last_floor_visited").default("PH"),
  // R3.2 — cross-agent shared-knowledge bridge. Keyed two-level:
  // { [agentKey]: { [entryKey]: { value, writtenAt, writtenBy } } }.
  // Read/write via src/lib/db/queries/shared-knowledge-rest.ts; never
  // mutate this jsonb from route handlers directly.
  sharedKnowledge: jsonb("shared_knowledge").default(sql`'{}'::jsonb`),
  // R4.1 — Lobby onboarding state. Stamped exactly once per account when
  // the cinematic arrival plays (claimArrivalPlay uses an atomic
  // WHERE arrival_played_at IS NULL update); a null value means the
  // first-visit arrival still owes the user, a timestamp means we already
  // played it and must never play it again.
  arrivalPlayedAt: timestamp("arrival_played_at", { withTimezone: true }),
  // Full extracted Concierge target profile (mirrors the canonical
  // [target_profile_v1] row in agent_memory for fast reads without a
  // full memory-query roundtrip). Null until Otis's conversation finishes.
  conciergeTargetProfile: jsonb("concierge_target_profile"),
  // Stamp set the moment Otis's conversation completes (or is skipped).
  // Used by the first-run Morning Briefing override to decide if we are
  // within the bootstrap window (≤10 m after completion).
  conciergeCompletedAt: timestamp("concierge_completed_at", { withTimezone: true }),
  // Idempotency flag for the first-run Morning Briefing override. Flipped
  // true atomically on first Penthouse mount after onboarding so we never
  // replay the bootstrap briefing.
  firstBriefingShown: boolean("first_briefing_shown").notNull().default(false),
  // Drives the Building Directory cross-section — the lobby diorama that
  // lights up the floors the user has actually reached. Seeded as ["L"]
  // (everyone is in the Lobby at creation); extended by syncFloorsUnlocked
  // as applications, contacts, interviews, etc. appear.
  floorsUnlocked: text("floors_unlocked").array().notNull().default(sql`'{L}'::text[]`),
  // R6 — Mock interview drill voice opt-in.
  // voiceRecordingEnabled: default false. User can flip true in Settings or
  // at drill start. Gated end-to-end by /api/briefing/audio-upload and
  // /api/briefing/transcribe (403 if false).
  voiceRecordingEnabled: boolean("voice_recording_enabled")
    .notNull()
    .default(false),
  // voiceRecordingPermanentlyDisabled: one-way latch. Once true, neither the
  // UI toggle nor the PUT /api/briefing/voice-preference route will re-enable
  // voice. Intended for users who want voice permanently off regardless of
  // future UI prompts.
  voiceRecordingPermanentlyDisabled: boolean("voice_recording_permanently_disabled")
    .notNull()
    .default(false),
  // R6 — Per-user drill tuning. interruptFirmness: gentle|firm|hardass gates
  // how aggressively CPO's interrupt-rules FSM fires. timerSeconds: default
  // 90s amber threshold; 120s hard cap.
  drillPreferences: jsonb("drill_preferences")
    .notNull()
    .default(sql`'{"interruptFirmness":"firm","timerSeconds":90}'::jsonb`),
  // R7 — Pneumatic-tube quiet-hours preference. Shape:
  // {"start":"HH:MM","end":"HH:MM"} or null (always deliver immediately).
  // Wrap-around is allowed (start="22:00", end="07:00" = overnight quiet).
  // Server reads this at notification insert to compute deliver_after; tubes
  // queued during quiet hours land at wake-up, never at 3am.
  quietHours: jsonb("quiet_hours"),
  // R8 — Cross-user Warm Intro Network consent. `consentAt` stamps opt-in;
  // `revokedAt` stamps the last revoke (may precede a newer consent).
  // `consentVersion` bumps when the consent copy changes, forcing
  // re-consent.  The assertConsented guard treats consent as active when
  // consentAt is set AND (revokedAt IS NULL OR revokedAt < consentAt).
  networkingConsentAt: timestamp("networking_consent_at", { withTimezone: true }),
  networkingRevokedAt: timestamp("networking_revoked_at", { withTimezone: true }),
  networkingConsentVersion: integer("networking_consent_version").default(0),
  // R11 — Cross-user warm-intro matching. Stamped each time the per-user
  // match-candidate scan (re)builds this user's ranked candidate index in
  // `match_candidate_index`. The scan scheduler compares this timestamp
  // against the TTL window (invalidatesAt on each row) to decide whether
  // a rescan is due. Null means no scan has ever run for this account.
  matchIndexLastRescanAt: timestamp("match_index_last_rescan_at", { withTimezone: true }),
  ...timestamps,
}, () => [
  pgPolicy("user_profiles_self_access", {
    for: "all",
    to: "authenticated",
    using: sql`auth.uid() = id`,
    withCheck: sql`auth.uid() = id`,
  }),
]);

// ===========================================================================
// 1. COMPANIES
// ===========================================================================
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  sector: text("sector"),
  size: text("size", { enum: ["startup", "mid", "large", "enterprise"] }),
  headquarters: text("headquarters"),
  description: text("description"),
  cultureSummary: text("culture_summary"),
  recentNews: text("recent_news"),
  financialsSummary: text("financials_summary"),
  researchFreshness: timestamp("research_freshness", { withTimezone: true }),
  tier: integer("tier"),
  logoUrl: text("logo_url"),
  careersUrl: text("careers_url"),
  linkedinUrl: text("linkedin_url"),
  glassdoorUrl: text("glassdoor_url"),
  secCik: text("sec_cik"),
  keyPeople: jsonb("key_people"),
  internshipIntel: text("internship_intel"),
  yourConnections: jsonb("your_connections"),
  ...timestamps,
}, (table) => [
  userIsolation("companies"),
  index("idx_companies_user_tier").on(table.userId, table.tier),
  // Trigram index for `searchCompaniesByName` (ilike '%q%') — created in
  // migration 0002. Drizzle doesn't natively express GIN trgm, so it is
  // documented here but emitted by raw SQL in the migration.
]);

// ===========================================================================
// 2. APPLICATIONS
// ===========================================================================
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  url: text("url"),
  status: text("status", {
    enum: ["discovered", "applied", "screening", "interview_scheduled", "interviewing",
           "under_review", "offer", "accepted", "rejected", "withdrawn"],
  }).notNull().default("discovered"),
  tier: integer("tier"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  source: text("source"),
  notes: text("notes"),
  sector: text("sector"),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  salary: text("salary"),
  location: text("location"),
  position: text("position"),
  companyName: text("company_name"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  // Job Discovery score (0.000–1.000). Populated by CRO on ingest; used by
  // the war-table sort and the CRO whiteboard's "top finds" list. Nullable
  // because rows created pre-R1.3 + manually-entered rows don't have one.
  matchScore: numeric("match_score", { precision: 4, scale: 3 }),
  // R7 — Optional hard deadline for the application. Feeds the Floor-4 Final
  // Countdown section and the 3-beat cron (t_24h, t_4h, t_0). Null means no
  // known deadline; user sets this from the ApplicationModal.
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  // R7 — Per-app dedupe for the 3-beat deadline cron. Shape:
  // {"t_24h":"ISO","t_4h":"ISO","t_0":"ISO"} — each key optional, value is
  // the timestamp the beat was fired. Presence of a key = that beat already
  // fired and must not fire again.
  deadlineAlertsSent: jsonb("deadline_alerts_sent")
    .notNull()
    .default(sql`'{}'::jsonb`),
  ...timestamps,
}, (table) => [
  userIsolation("applications"),
  index("idx_apps_user_status").on(table.userId, table.status),
  index("idx_apps_user_company").on(table.userId, table.companyId),
  index("idx_apps_created").on(table.createdAt),
  index("idx_apps_user_status_pos").on(table.userId, table.status, table.position),
  // Stale-pipeline / follow-up sort. (Migration 0002.)
  index("idx_apps_user_last_activity").on(
    table.userId,
    table.lastActivityAt.desc().nullsLast(),
  ),
  // CRO Job Discovery sort. (Migration 0011.)
  index("idx_apps_user_match_score").on(
    table.userId,
    table.matchScore.desc().nullsLast(),
  ),
  // R7 — Final Countdown sort. (Migration 0017.) Partial index: only apps
  // with a deadline set.
  index("idx_apps_user_deadline").on(
    table.userId,
    table.deadlineAt,
  ),
]);

// ===========================================================================
// 3. CONTACTS
// ===========================================================================
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email"),
  title: text("title"),
  linkedinUrl: text("linkedin_url"),
  relationship: text("relationship", {
    enum: ["alumni", "recruiter", "referral", "cold", "warm_intro"],
  }),
  phone: text("phone"),
  introducedBy: text("introduced_by"),
  warmth: integer("warmth").default(50),
  lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
  notes: text("notes"),
  // R8 — Private note. The sharpening detail. NEVER exposed to AI-prompt
  // composition, export pipelines, or cross-user surfaces.  P5 grep
  // invariant allowlists exactly the files that may reference this column.
  privateNote: text("private_note"),
  source: text("source", { enum: ["apollo", "hunter", "pdl", "manual"] }),
  ...timestamps,
}, (table) => [
  userIsolation("contacts"),
  index("idx_contacts_user_company").on(table.userId, table.companyId),
  index("idx_contacts_warmth").on(table.warmth),
  // Cooling/cold contact warmth sort relies on last_contact_at, not the
  // stored warmth column. (Migration 0002.)
  index("idx_contacts_user_last_contact").on(
    table.userId,
    table.lastContactAt.desc().nullsLast(),
  ),
]);

// ===========================================================================
// 4. EMAILS
// ===========================================================================
export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  gmailId: text("gmail_id"),
  threadId: text("thread_id"),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  fromAddress: text("from_address"),
  toAddress: text("to_address"),
  subject: text("subject"),
  snippet: text("snippet"),
  bodyText: text("body_text"),
  classification: text("classification", {
    enum: ["interview_invite", "rejection", "info_request", "follow_up_needed", "offer", "newsletter", "other"],
  }),
  urgency: text("urgency", { enum: ["high", "medium", "low"] }),
  suggestedAction: text("suggested_action"),
  isRead: boolean("is_read").default(false),
  isProcessed: boolean("is_processed").default(false),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation("emails"),
  // Per-user uniqueness: a single user cannot have the same gmail message
  // twice, but two different users sharing a forwarded thread can both
  // store it. (Migration 0002 — was previously global UNIQUE.)
  unique("emails_user_gmail_id_unique").on(table.userId, table.gmailId),
  index("idx_emails_gmail_id").on(table.gmailId),
  index("idx_emails_user_class").on(table.userId, table.classification),
  index("idx_emails_user_received").on(table.userId, table.receivedAt.desc().nullsLast()),
]);

// ===========================================================================
// 5. DOCUMENTS
// ===========================================================================
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  type: text("type", { enum: ["cover_letter", "resume_tailored", "prep_packet", "debrief"] }),
  title: text("title"),
  content: text("content"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(false),
  parentId: uuid("parent_id"),
  generatedBy: text("generated_by"),
  ...timestamps,
}, (table) => [
  userIsolation("documents"),
  index("idx_docs_user_app").on(table.userId, table.applicationId),
  index("idx_docs_type").on(table.type),
]);

// ===========================================================================
// 6. INTERVIEWS
// ===========================================================================
export const interviews = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  round: text("round"),
  format: text("format"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes").default(60),
  location: text("location"),
  interviewerName: text("interviewer_name"),
  interviewerTitle: text("interviewer_title"),
  interviewerLinkedin: text("interviewer_linkedin"),
  status: text("status", { enum: ["scheduled", "completed", "cancelled", "rescheduled"] }),
  prepPacketId: uuid("prep_packet_id").references(() => documents.id, { onDelete: "set null" }),
  debriefId: uuid("debrief_id").references(() => documents.id, { onDelete: "set null" }),
  calendarEventId: text("calendar_event_id"),
  notes: text("notes"),
  ...timestamps,
}, (table) => [
  userIsolation("interviews"),
  index("idx_interviews_user_sched").on(table.userId, table.scheduledAt),
]);

// ===========================================================================
// 7. CALENDAR EVENTS
// ===========================================================================
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  googleEventId: text("google_event_id"),
  title: text("title"),
  description: text("description"),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  location: text("location"),
  interviewId: uuid("interview_id").references(() => interviews.id, { onDelete: "set null" }),
  source: text("source").default("google"),
  ...timestamps,
}, (table) => [
  userIsolation("calendar_events"),
  // Per-user uniqueness — see emails table for the same rationale.
  // (Migration 0002.)
  unique("calendar_events_user_event_id_unique").on(table.userId, table.googleEventId),
  index("idx_cal_user_start").on(table.userId, table.startAt),
]);

// ===========================================================================
// 8. OUTREACH QUEUE
// ===========================================================================
export const outreachQueue = pgTable("outreach_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  type: text("type", {
    enum: [
      "cold_email", "follow_up", "thank_you", "networking", "cover_letter_send",
      // R10.1 — Negotiation Parlor queue rows. `negotiation` carries the
      // drafted negotiation script with the same 24h send-hold R7 wires in
      // via `sendAfter`; `reference_request` carries CNO-drafted reference
      // asks sent from the Parlor's CNO chair.
      "negotiation", "reference_request",
    ],
  }),
  subject: text("subject"),
  body: text("body"),
  status: text("status", {
    enum: ["pending_approval", "approved", "sent", "rejected", "expired"],
  }).notNull().default("pending_approval"),
  generatedBy: text("generated_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  // R7 — REAL undo. Earliest moment the cron sender may pick up this row.
  // Set to now()+30s by /api/outreach/approve. The cron predicate is
  // `send_after <= now()`; the undo predicate is `send_after > now()`.
  // Mutual exclusion is enforced by the database, not the UI — the race
  // between a late-clicked cancel and an early cron tick is decided
  // atomically by Postgres.
  sendAfter: timestamp("send_after", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  resendMessageId: text("resend_message_id"),
  // R7 — Audit trail stamped by /api/outreach/undo on successful revert.
  // Set means the user cancelled within the undo window; status flipped
  // back to 'pending_approval' at the same time.
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  // R5.6 — tone-group + selection state for cover_letter_send rows.
  // Application-enforced shape; see migration 0015 header for the JSON schema.
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  ...timestamps,
}, (table) => [
  userIsolation("outreach_queue"),
  index("idx_outreach_user_status").on(table.userId, table.status),
]);

// ===========================================================================
// 9. NOTIFICATIONS
// ===========================================================================
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  type: text("type"),
  priority: text("priority", { enum: ["critical", "high", "medium", "low"] }),
  title: text("title"),
  body: text("body"),
  sourceAgent: text("source_agent"),
  sourceEntityId: uuid("source_entity_id"),
  sourceEntityType: text("source_entity_type"),
  channels: jsonb("channels"),
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  actions: jsonb("actions"),
  // R7 — Pneumatic-tube quiet-hours queueing. Set at notification insert
  // from user's quiet_hours + timezone. Null (legacy rows) = deliver
  // immediately. Client-side tube subscriber only renders rows where
  // deliver_after <= now().
  deliverAfter: timestamp("deliver_after", { withTimezone: true }),
  // R7 — Stamped atomically by the first client session that claims the
  // row. Ensures no double-tube for the same notification across tabs/
  // devices: concurrent sessions race on `UPDATE ... SET delivered_at=now()
  // WHERE delivered_at IS NULL RETURNING id`; only one wins.
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation("notifications"),
  index("idx_notif_user_read").on(table.userId, table.isRead),
]);

// ===========================================================================
// 10. AGENT LOGS
// ===========================================================================
export const agentLogs = pgTable("agent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  agent: text("agent"),
  worker: text("worker"),
  action: text("action"),
  status: text("status", { enum: ["running", "completed", "failed", "cancelled"] }),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  error: text("error"),
  tokensUsed: integer("tokens_used"),
  costCents: numeric("cost_cents", { precision: 10, scale: 2 }),
  durationMs: integer("duration_ms"),
  inngestRunId: text("inngest_run_id"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation("agent_logs"),
  index("idx_logs_user_agent").on(table.userId, table.agent),
]);

// ===========================================================================
// 10a. AGENT DISPATCHES — the dispatch tree produced by one CEO bell-ring.
// Each row is a single CEO→subagent dispatch within a user turn. `request_id`
// groups every dispatch produced by the same bell-ring so the UI can render
// a fan-out timeline and the orchestrator can aggregate results. `depends_on`
// is an empty array today; R3's later phases use it to schedule 2-level
// dispatches (e.g. a follow-up subagent that waits on another's summary).
// Status transitions: queued → running → completed|failed. Tokens + timing
// roll up into the per-request telemetry the War Room's CRO panel reads.
// ===========================================================================
export const agentDispatches = pgTable("agent_dispatches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  requestId: text("request_id").notNull(),
  parentDispatchId: uuid("parent_dispatch_id"),
  agent: text("agent").notNull(),
  dependsOn: uuid("depends_on").array().notNull().default(sql`'{}'::uuid[]`),
  task: text("task").notNull(),
  status: text("status", { enum: ["queued", "running", "completed", "failed"] }).notNull().default("queued"),
  summary: text("summary"),
  tokensUsed: integer("tokens_used").default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation("agent_dispatches"),
  index("idx_dispatches_user_request").on(table.userId, table.requestId),
  index("idx_dispatches_request_status").on(table.requestId, table.status),
]);

// ===========================================================================
// 10b. AUDIT LOGS — security-sensitive events (distinct from agent_logs
// cost telemetry). Reads gated to the owning user; writes are service-role
// only (no INSERT/UPDATE/DELETE policy). The `event_type` CHECK constraint
// and the `ip_address` column's inet cast are applied via hand-edit in the
// generated migration — see drizzle migration 0007_audit_logs.sql.
// ===========================================================================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  ipAddress: text("ip_address"), // text here; altered to inet in hand-edited migration
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  pgPolicy("audit_logs_self_read", {
    for: "select",
    to: "authenticated",
    using: sql`auth.uid() = user_id`,
  }),
  // No INSERT/UPDATE/DELETE policy — writes are service-role only.
  index("idx_audit_logs_user_created").on(table.userId, table.createdAt),
  index("idx_audit_logs_event_type").on(table.eventType, table.createdAt),
]);

// ===========================================================================
// 11. AGENT MEMORY (pgvector)
// ===========================================================================
export const agentMemory = pgTable("agent_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  agent: text("agent"),
  category: text("category", { enum: ["preference", "pattern", "fact", "feedback"] }),
  content: text("content"),
  embedding: vector("embedding", { dimensions: 1536 }),
  importance: numeric("importance", { precision: 3, scale: 2 }).default("0.50"),
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  ...timestamps,
}, () => [
  userIsolation("agent_memory"),
]);

// ===========================================================================
// 12. DAILY SNAPSHOTS
// ===========================================================================
export const dailySnapshots = pgTable("daily_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  totalApplications: integer("total_applications"),
  activePipeline: integer("active_pipeline"),
  interviewsScheduled: integer("interviews_scheduled"),
  offers: integer("offers"),
  rejections: integer("rejections"),
  emailsProcessed: integer("emails_processed"),
  agentsRuns: integer("agents_runs"),
  totalCostCents: integer("total_cost_cents"),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }),
  staleCount: integer("stale_count"),
  appliedCount: integer("applied_count"),
  screeningCount: integer("screening_count"),
  interviewCount: integer("interview_count"),
  offerCount: integer("offer_count"),
  ...timestamps,
}, (table) => [
  userIsolation("daily_snapshots"),
  index("idx_snap_user_date").on(table.userId, table.date),
  // Required for `.upsert(..., { onConflict: "user_id,date" })` in
  // daily-snapshots-rest.ts:104 + cron/briefing/route.ts:145.
  // (Migration 0002.)
  unique("daily_snapshots_user_date_unique").on(table.userId, table.date),
]);

// ===========================================================================
// 13. COMPANY EMBEDDINGS (pgvector)
// ===========================================================================
export const companyEmbeddings = pgTable("company_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  content: text("content"),
  embedding: vector("embedding", { dimensions: 1536 }),
  ...timestamps,
}, (table) => [
  userIsolation("company_embeddings"),
  // Lets us drop the DELETE-then-INSERT upsert pattern in embeddings-rest.ts
  // for an atomic .upsert(..., { onConflict: "user_id,company_id" }).
  // (Migration 0002.)
  unique("company_embeddings_user_company_unique").on(table.userId, table.companyId),
]);

// ===========================================================================
// 14. JOB EMBEDDINGS (pgvector)
// ===========================================================================
export const jobEmbeddings = pgTable("job_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  content: text("content"),
  embedding: vector("embedding", { dimensions: 1536 }),
  ...timestamps,
}, (table) => [
  userIsolation("job_embeddings"),
  // Same atomic-upsert reason as company_embeddings. (Migration 0002.)
  unique("job_embeddings_user_application_unique").on(table.userId, table.applicationId),
]);

// ===========================================================================
// 15. PROGRESSION MILESTONES
// ===========================================================================
export const progressionMilestones = pgTable("progression_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  milestone: text("milestone").notNull(),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow(),
  floorUnlocked: text("floor_unlocked"),
  ...timestamps,
}, (table) => [
  userIsolation("progression_milestones"),
  // Prevents duplicate unlocks under concurrent runs of
  // checkAndUnlockMilestones (engine.ts:121 inserts blindly).
  // (Migration 0002.)
  unique("progression_milestones_user_milestone_unique").on(table.userId, table.milestone),
]);

// ===========================================================================
// 16. STRIPE WEBHOOK EVENTS (idempotency + audit log — server-only)
// ===========================================================================
// Maps to `public.stripe_webhook_events` created manually via
// `src/db/manual/003_stripe_webhook_events.sql`. Webhook handlers consult this
// table before applying side effects so that Stripe retries are no-ops. RLS is
// locked to the service role only (policy grants to authenticated/anon are
// WHERE false — hard deny).
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(), // Stripe event id (evt_…)
  type: text("type").notNull(),
  livemode: boolean("livemode").notNull().default(false),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  status: text("status").notNull().default("received"),
  error: text("error"),
  payload: jsonb("payload"),
}, (table) => [
  index("idx_stripe_webhook_events_type_received").on(
    table.type,
    table.receivedAt.desc(),
  ),
]);

// ===========================================================================
// 17. BASE RESUMES (R5.1 — Writing Room)
// ===========================================================================
// User-uploaded PDF base resumes. The binary lives in Supabase Storage
// (`resumes` bucket, private, service-role only). `parsed_text` is the
// plain-text cache that CMO's tailoring tool reads from — avoids
// re-downloading + re-parsing the PDF on every generation. `is_active=true`
// marks the master resume the user currently considers canonical; flipping
// it (via setActiveBaseResume) flips all others inactive.
//
// Storage path convention: `u/<userId>/base-<uuid>.pdf`. The bucket is
// created + RLS'd via migration 0014.
// ===========================================================================
export const baseResumes = pgTable("base_resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  parsedText: text("parsed_text").notNull(),
  pageCount: integer("page_count").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (table) => [
  userIsolation("base_resumes"),
  index("idx_base_resumes_user_active").on(table.userId, table.isActive),
]);

// ===========================================================================
// 18. CONTACT EMBEDDINGS (pgvector — R8 warm-intro finder)
// ===========================================================================
// Stores a 1536-dim embedding per contact, generated from
// `${name} ${title ?? ""} ${companyName ?? ""}`. Queried intra-user only —
// the warm-intro scan cron computes cosine similarity between the
// contact's embedded-company and the target application's company.
// Cross-user queries are forbidden (RLS enforces user isolation).
export const contactEmbeddings = pgTable("contact_embeddings", {
  contactId: uuid("contact_id").primaryKey().references(() => contacts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  userIsolation("contact_embeddings"),
  index("idx_contact_embeddings_user").on(table.userId),
]);

// ===========================================================================
// 19. NETWORKING MATCH INDEX (R8 consent infra — empty in R8, live in R8.x)
// ===========================================================================
// Cross-user matching table. Populated when a consented user adds an active
// application; removed when a user revokes consent.  R8 ships the schema
// + RLS + revoke-clears-rows behavior, but the match-candidates endpoint
// returns 403 for all callers until the Red Team pass.  R8.x flips the
// endpoint to read this table for cross-user intro proposals.
export const networkingMatchIndex = pgTable("networking_match_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  targetCompanyName: text("target_company_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  userIsolation("networking_match_index"),
  index("idx_networking_match_user").on(table.userId),
]);

// ===========================================================================
// 19a. MATCH CANDIDATE INDEX (R11 — ranked candidates with TTL)
// ===========================================================================
// Per-user ranked cache of cross-user warm-intro candidates. Populated by
// the match-candidate scan from `networking_match_index` intersections;
// each row is a single counterparty surfaced for a single company context
// with an `edge_strength` score in [0, 1]. `invalidates_at` is the row's
// TTL expiry — the UI filters rows where invalidates_at > now() and the
// sweeper cron deletes expired rows. `counterparty_anon_key` is a stable
// hash of the other user's id scoped to this user's account so the client
// never learns counterparty identity until an intro is mutually accepted.
export const matchCandidateIndex = pgTable("match_candidate_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  counterpartyAnonKey: text("counterparty_anon_key").notNull(),
  companyContext: text("company_context").notNull(),
  edgeStrength: numeric("edge_strength", { precision: 4, scale: 3 }).notNull(),
  insertedAt: timestamp("inserted_at", { withTimezone: true }).notNull().defaultNow(),
  invalidatesAt: timestamp("invalidates_at", { withTimezone: true }).notNull(),
}, (table) => [
  userIsolation("match_candidate_index"),
  index("idx_match_candidate_user_invalidates").on(table.userId, table.invalidatesAt),
]);

// ===========================================================================
// 19b. MATCH EVENTS (R11 — audit log of fired matches)
// ===========================================================================
// Append-only audit trail of every match surfaced to this user. `match_reason`
// is a short human-readable rationale string (e.g. "shared alumni network at
// Acme"). Used by CFO analytics to attribute intros to specific match paths
// and by the Red Team for privacy audits — a user can always enumerate which
// candidates were surfaced to them and why.
export const matchEvents = pgTable("match_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  counterpartyAnonKey: text("counterparty_anon_key").notNull(),
  companyContext: text("company_context").notNull(),
  edgeStrength: numeric("edge_strength", { precision: 4, scale: 3 }).notNull(),
  firedAt: timestamp("fired_at", { withTimezone: true }).notNull().defaultNow(),
  matchReason: text("match_reason").notNull(),
}, (table) => [
  userIsolation("match_events"),
  index("idx_match_events_user_fired").on(table.userId, table.firedAt.desc()),
]);

// ===========================================================================
// 19c. MATCH RATE LIMITS (R11 — hourly bucket counter per user)
// ===========================================================================
// Bucketed per-user hourly counter for match-candidate calls. The composite
// primary key `(user_id, hour_bucket)` makes the counter UPSERT-safe without
// extra locking; the `bump_match_rate_limit` RPC atomically inserts-or-
// increments and returns whether the caller is under the limit. Rows older
// than a day are swept by the cleanup cron — the table stays small.
export const matchRateLimits = pgTable("match_rate_limits", {
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  hourBucket: timestamp("hour_bucket", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
}, (table) => [
  userIsolation("match_rate_limits"),
  index("idx_match_rate_limits_bucket").on(table.hourBucket),
  primaryKey({ columns: [table.userId, table.hourBucket] }),
]);

// ===========================================================================
// 20. REJECTION REFLECTIONS (R9.6 — Observatory autopsy)
// ===========================================================================
// Opt-in (Settings → Analytics → 'Rejection reflection prompts', default ON)
// per-application reflection rows. Captured inline on the application card
// when an app flips to status=rejected. `reasons` is a multi-select of chip
// labels; `free_text` is the optional supplemental note. UNIQUE(application_id)
// enforces one reflection per app — submitting again upserts via the API
// route's caller-side dedupe, not at the DB level. CFO aggregates over this
// table to surface patterns ("3 of your last 5 rejections were 'No response'").
export const rejectionReflections = pgTable("rejection_reflections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }).unique(),
  reasons: text("reasons").array().notNull().default(sql`'{}'::text[]`),
  freeText: text("free_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  userIsolation("rejection_reflections"),
  index("idx_rejection_reflections_user_created").on(table.userId, table.createdAt.desc()),
]);

// ===========================================================================
// 21. OFFERS (R10 — Negotiation Parlor ledger)
// ===========================================================================
// Per-user offer ledger. `applicationId` is nullable because offers can
// arrive from companies the user never tracked (partner referrals, direct
// recruiter pings). `status` mirrors the Parlor door-materialization gate
// and the comp-chart pin stacking — the Parlor door itself is rendered
// server-side only when there is at least one row with status != 'withdrawn'.
// See migration 0020 for the CHECK constraint and updated_at trigger.
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  companyName: text("company_name").notNull(),
  role: text("role").notNull(),
  level: text("level"),
  location: text("location").notNull(),
  base: integer("base").notNull(),
  bonus: integer("bonus").notNull().default(0),
  equity: integer("equity").notNull().default(0),
  signOn: integer("sign_on").notNull().default(0),
  housing: integer("housing").notNull().default(0),
  startDate: date("start_date"),
  benefits: jsonb("benefits").notNull().default(sql`'{}'::jsonb`),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  deadlineAlertsSent: jsonb("deadline_alerts_sent")
    .notNull()
    .default(sql`'{}'::jsonb`),
  status: text("status", {
    enum: ["received", "negotiating", "accepted", "declined", "expired", "withdrawn"],
  }).notNull().default("received"),
  ...timestamps,
}, (table) => [
  userIsolation("offers"),
  index("idx_offers_user_received").on(table.userId, table.receivedAt.desc()),
]);

// ===========================================================================
// 22. COMPANY COMP BANDS (R10 — Negotiation Parlor, global cache)
// ===========================================================================
// Shared across all authenticated users. Scraped from Levels.fyi via
// Firecrawl with a 30-day TTL; `sampleSize` records the number of data
// points that backed the percentiles. RLS grants read-only access to
// authenticated users; writes are service-role only. The lookup tuple is
// (companyNameNormalized, role, location, level); percentile columns are
// nullable because a cache row can exist without data (e.g. empty-result
// scrape cached to avoid re-hitting Firecrawl for 30 days).
export const companyCompBands = pgTable("company_comp_bands", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyNameNormalized: text("company_name_normalized").notNull(),
  role: text("role").notNull(),
  location: text("location").notNull(),
  level: text("level").notNull().default(""),
  baseP25: integer("base_p25"),
  baseP50: integer("base_p50"),
  baseP75: integer("base_p75"),
  bonusP25: integer("bonus_p25"),
  bonusP50: integer("bonus_p50"),
  bonusP75: integer("bonus_p75"),
  equityP25: integer("equity_p25"),
  equityP50: integer("equity_p50"),
  equityP75: integer("equity_p75"),
  sampleSize: integer("sample_size").notNull().default(0),
  source: text("source").notNull().default("levels.fyi"),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .default(sql`(now() + interval '30 days')`),
}, (table) => [
  unique("comp_bands_unique").on(
    table.companyNameNormalized,
    table.role,
    table.location,
    table.level,
  ),
  index("idx_comp_bands_lookup").on(
    table.companyNameNormalized,
    table.role,
    table.location,
  ),
]);

// ===========================================================================
// 23. COMP BANDS BUDGET (R10 — monthly scrape-credit counter)
// ===========================================================================
// Firecrawl free tier is 500 credits/month. This table tracks how many
// we've spent in the current month keyed by `monthKey` (e.g. "2026-04")
// so the scraper can gate itself below the ceiling. No user access —
// RLS is enabled with no policies, which means authenticated clients
// cannot read or write. Service role only.
export const compBandsBudget = pgTable("comp_bands_budget", {
  monthKey: text("month_key").primaryKey(),
  scrapeCount: integer("scrape_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===========================================================================
// TYPE EXPORTS
// ===========================================================================
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
export type OutreachItem = typeof outreachQueue.$inferSelect;
export type NewOutreachItem = typeof outreachQueue.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type AgentLog = typeof agentLogs.$inferSelect;
export type NewAgentLog = typeof agentLogs.$inferInsert;
export type AgentDispatch = typeof agentDispatches.$inferSelect;
export type NewAgentDispatch = typeof agentDispatches.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AgentMemoryEntry = typeof agentMemory.$inferSelect;
export type NewAgentMemoryEntry = typeof agentMemory.$inferInsert;
export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type NewDailySnapshot = typeof dailySnapshots.$inferInsert;
export type CompanyEmbedding = typeof companyEmbeddings.$inferSelect;
export type JobEmbedding = typeof jobEmbeddings.$inferSelect;
export type ContactEmbedding = typeof contactEmbeddings.$inferSelect;
export type NewContactEmbedding = typeof contactEmbeddings.$inferInsert;
export type NetworkingMatchIndex = typeof networkingMatchIndex.$inferSelect;
export type NewNetworkingMatchIndex = typeof networkingMatchIndex.$inferInsert;
// R11 — Cross-user warm-intro matching
export type MatchCandidateIndex = typeof matchCandidateIndex.$inferSelect;
export type NewMatchCandidateIndex = typeof matchCandidateIndex.$inferInsert;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type NewMatchEvent = typeof matchEvents.$inferInsert;
export type MatchRateLimit = typeof matchRateLimits.$inferSelect;
export type ProgressionMilestone = typeof progressionMilestones.$inferSelect;
export type NewProgressionMilestone = typeof progressionMilestones.$inferInsert;
export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
export type BaseResume = typeof baseResumes.$inferSelect;
export type NewBaseResume = typeof baseResumes.$inferInsert;
export type RejectionReflection = typeof rejectionReflections.$inferSelect;
export type NewRejectionReflection = typeof rejectionReflections.$inferInsert;
// R10 — Negotiation Parlor
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type CompBands = typeof companyCompBands.$inferSelect;
export type NewCompBands = typeof companyCompBands.$inferInsert;
export type CompBandsBudget = typeof compBandsBudget.$inferSelect;
export type NewCompBandsBudget = typeof compBandsBudget.$inferInsert;
