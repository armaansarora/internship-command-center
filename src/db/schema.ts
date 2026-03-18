import {
  pgTable, uuid, text, integer, boolean, timestamp,
  numeric, jsonb, index, pgPolicy, vector,
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
  subscriptionTier: text("subscription_tier", {
    enum: ["free", "pro", "team"],
  }).default("free"),
  lastFloorVisited: text("last_floor_visited").default("PH"),
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
  ...timestamps,
}, (table) => [
  userIsolation("applications"),
  index("idx_apps_user_status").on(table.userId, table.status),
  index("idx_apps_user_company").on(table.userId, table.companyId),
  index("idx_apps_created").on(table.createdAt),
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
  source: text("source", { enum: ["apollo", "hunter", "pdl", "manual"] }),
  ...timestamps,
}, (table) => [
  userIsolation("contacts"),
  index("idx_contacts_user_company").on(table.userId, table.companyId),
  index("idx_contacts_warmth").on(table.warmth),
]);

// ===========================================================================
// 4. EMAILS
// ===========================================================================
export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  gmailId: text("gmail_id").unique(),
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
  index("idx_emails_gmail_id").on(table.gmailId),
  index("idx_emails_user_class").on(table.userId, table.classification),
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
  googleEventId: text("google_event_id").unique(),
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
    enum: ["cold_email", "follow_up", "thank_you", "networking", "cover_letter_send"],
  }),
  subject: text("subject"),
  body: text("body"),
  status: text("status", {
    enum: ["pending_approval", "approved", "sent", "rejected", "expired"],
  }).notNull().default("pending_approval"),
  generatedBy: text("generated_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  resendMessageId: text("resend_message_id"),
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
}, (table) => [
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
  ...timestamps,
}, (table) => [
  userIsolation("daily_snapshots"),
  index("idx_snap_user_date").on(table.userId, table.date),
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
]);

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
export type AgentMemoryEntry = typeof agentMemory.$inferSelect;
export type NewAgentMemoryEntry = typeof agentMemory.$inferInsert;
export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type NewDailySnapshot = typeof dailySnapshots.$inferInsert;
export type CompanyEmbedding = typeof companyEmbeddings.$inferSelect;
export type JobEmbedding = typeof jobEmbeddings.$inferSelect;
export type ProgressionMilestone = typeof progressionMilestones.$inferSelect;
export type NewProgressionMilestone = typeof progressionMilestones.$inferInsert;
