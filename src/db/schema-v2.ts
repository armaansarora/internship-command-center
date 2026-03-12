import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  index,
  foreignKey,
} from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const randomHex = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

const id = () =>
  text('id').primaryKey().$defaultFn(randomHex);

const createdAt = () =>
  text('created_at').notNull().$defaultFn(() => new Date().toISOString());

const updatedAt = () =>
  text('updated_at').notNull().$defaultFn(() => new Date().toISOString());

// ===========================================================================
// 1. COMPANIES (referenced by applications, contacts, etc.)
// ===========================================================================
export const companies = sqliteTable(
  'companies',
  {
    id: id(),
    name: text('name').notNull(),
    domain: text('domain'),
    industry: text('industry'),
    sector: text('sector'),
    size: text('size', {
      enum: ['startup', 'mid', 'large', 'enterprise'],
    }),
    headquarters: text('headquarters'),
    description: text('description'),
    cultureSummary: text('culture_summary'),
    recentNews: text('recent_news'),
    financialsSummary: text('financials_summary'),
    researchFreshness: text('research_freshness'),
    tier: integer('tier'),
    logoUrl: text('logo_url'),
    careersUrl: text('careers_url'),
    linkedinUrl: text('linkedin_url'),
    glassdoorUrl: text('glassdoor_url'),
    secCik: text('sec_cik'),
    keyPeople: text('key_people', { mode: 'json' }),
    internshipIntel: text('internship_intel'),
    yourConnections: text('your_connections', { mode: 'json' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('idx_companies_tier').on(table.tier),
  ],
);

// ===========================================================================
// 2. APPLICATIONS
// ===========================================================================
export const applications = sqliteTable(
  'applications',
  {
    id: id(),
    companyId: text('company_id').references(() => companies.id, {
      onDelete: 'set null',
    }),
    role: text('role').notNull(),
    url: text('url'),
    status: text('status', {
      enum: [
        'discovered',
        'applied',
        'screening',
        'interview_scheduled',
        'interviewing',
        'under_review',
        'offer',
        'accepted',
        'rejected',
        'withdrawn',
      ],
    })
      .notNull()
      .default('discovered'),
    tier: integer('tier'),
    appliedAt: text('applied_at'),
    source: text('source'),
    notes: text('notes'),
    salary: text('salary'),
    location: text('location'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('idx_v2_applications_status').on(table.status),
    index('idx_v2_applications_company_id').on(table.companyId),
    index('idx_v2_applications_tier').on(table.tier),
    index('idx_v2_applications_created_at').on(table.createdAt),
  ],
);

// ===========================================================================
// 3. CONTACTS
// ===========================================================================
export const contacts = sqliteTable(
  'contacts',
  {
    id: id(),
    companyId: text('company_id').references(() => companies.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    email: text('email'),
    title: text('title'),
    linkedinUrl: text('linkedin_url'),
    relationship: text('relationship', {
      enum: ['alumni', 'recruiter', 'referral', 'cold', 'warm_intro'],
    }),
    warmth: integer('warmth').default(50),
    lastContactAt: text('last_contact_at'),
    notes: text('notes'),
    source: text('source', {
      enum: ['apollo', 'hunter', 'pdl', 'manual'],
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('idx_v2_contacts_company_id').on(table.companyId),
    index('idx_v2_contacts_warmth').on(table.warmth),
  ],
);

// ===========================================================================
// 4. EMAILS
// ===========================================================================
export const emails = sqliteTable(
  'emails',
  {
    id: id(),
    gmailId: text('gmail_id').unique(),
    threadId: text('thread_id'),
    applicationId: text('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),
    contactId: text('contact_id').references(() => contacts.id, {
      onDelete: 'set null',
    }),
    fromAddress: text('from_address'),
    toAddress: text('to_address'),
    subject: text('subject'),
    snippet: text('snippet'),
    bodyText: text('body_text'),
    classification: text('classification', {
      enum: [
        'interview_invite',
        'rejection',
        'info_request',
        'follow_up_needed',
        'offer',
        'newsletter',
        'other',
      ],
    }),
    urgency: text('urgency', { enum: ['high', 'medium', 'low'] }),
    suggestedAction: text('suggested_action'),
    isRead: integer('is_read', { mode: 'boolean' }).default(false),
    isProcessed: integer('is_processed', { mode: 'boolean' }).default(false),
    receivedAt: text('received_at'),
    createdAt: createdAt(),
  },
  (table) => [
    index('idx_v2_emails_gmail_id').on(table.gmailId),
    index('idx_v2_emails_classification').on(table.classification),
    index('idx_v2_emails_application_id').on(table.applicationId),
  ],
);

// ===========================================================================
// 5. DOCUMENTS
// ===========================================================================
export const documents = sqliteTable(
  'documents',
  {
    id: id(),
    applicationId: text('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),
    companyId: text('company_id').references(() => companies.id, {
      onDelete: 'set null',
    }),
    type: text('type', {
      enum: ['cover_letter', 'resume_tailored', 'prep_packet', 'debrief'],
    }),
    title: text('title'),
    content: text('content'),
    version: integer('version').default(1),
    parentId: text('parent_id'),
    generatedBy: text('generated_by'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'fk_documents_parent_id',
    }),
    index('idx_v2_documents_application_id').on(table.applicationId),
    index('idx_v2_documents_type').on(table.type),
  ],
);

// ===========================================================================
// 6. INTERVIEWS
// ===========================================================================
export const interviews = sqliteTable(
  'interviews',
  {
    id: id(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    companyId: text('company_id').references(() => companies.id, {
      onDelete: 'set null',
    }),
    round: text('round'),
    format: text('format'),
    scheduledAt: text('scheduled_at'),
    durationMinutes: integer('duration_minutes').default(60),
    location: text('location'),
    interviewerName: text('interviewer_name'),
    interviewerTitle: text('interviewer_title'),
    interviewerLinkedin: text('interviewer_linkedin'),
    status: text('status', {
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    }),
    prepPacketId: text('prep_packet_id').references(() => documents.id, {
      onDelete: 'set null',
    }),
    debriefId: text('debrief_id').references(() => documents.id, {
      onDelete: 'set null',
    }),
    calendarEventId: text('calendar_event_id'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('idx_v2_interviews_application_id').on(table.applicationId),
    index('idx_v2_interviews_scheduled_at').on(table.scheduledAt),
  ],
);

// ===========================================================================
// 7. CALENDAR EVENTS
// ===========================================================================
export const calendarEvents = sqliteTable(
  'calendar_events',
  {
    id: id(),
    googleEventId: text('google_event_id').unique(),
    title: text('title'),
    description: text('description'),
    startAt: text('start_at'),
    endAt: text('end_at'),
    location: text('location'),
    interviewId: text('interview_id').references(() => interviews.id, {
      onDelete: 'set null',
    }),
    source: text('source').default('google'),
    createdAt: createdAt(),
  },
  (table) => [
    index('idx_v2_calendar_events_start_at').on(table.startAt),
    index('idx_v2_calendar_events_google_event_id').on(table.googleEventId),
  ],
);

// ===========================================================================
// 8. OUTREACH QUEUE
// ===========================================================================
export const outreachQueue = sqliteTable(
  'outreach_queue',
  {
    id: id(),
    applicationId: text('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),
    contactId: text('contact_id').references(() => contacts.id, {
      onDelete: 'set null',
    }),
    companyId: text('company_id').references(() => companies.id, {
      onDelete: 'set null',
    }),
    type: text('type', {
      enum: [
        'cold_email',
        'follow_up',
        'thank_you',
        'networking',
        'cover_letter_send',
      ],
    }),
    subject: text('subject'),
    body: text('body'),
    status: text('status', {
      enum: ['pending_approval', 'approved', 'sent', 'rejected', 'expired'],
    })
      .notNull()
      .default('pending_approval'),
    generatedBy: text('generated_by'),
    approvedAt: text('approved_at'),
    sentAt: text('sent_at'),
    resendMessageId: text('resend_message_id'),
    createdAt: createdAt(),
  },
  (table) => [
    index('idx_v2_outreach_queue_status').on(table.status),
    index('idx_v2_outreach_queue_created_at').on(table.createdAt),
  ],
);

// ===========================================================================
// 9. NOTIFICATIONS
// ===========================================================================
export const notifications = sqliteTable(
  'notifications',
  {
    id: id(),
    type: text('type'),
    priority: text('priority', {
      enum: ['critical', 'high', 'medium', 'low'],
    }),
    title: text('title'),
    body: text('body'),
    sourceAgent: text('source_agent'),
    sourceEntityId: text('source_entity_id'),
    sourceEntityType: text('source_entity_type'),
    channels: text('channels', { mode: 'json' }),
    isRead: integer('is_read', { mode: 'boolean' }).default(false),
    isDismissed: integer('is_dismissed', { mode: 'boolean' }).default(false),
    actions: text('actions', { mode: 'json' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('idx_v2_notifications_is_read').on(table.isRead),
    index('idx_v2_notifications_created_at').on(table.createdAt),
  ],
);

// ===========================================================================
// 10. USER PREFERENCES (single-row)
// ===========================================================================
export const userPreferences = sqliteTable('user_preferences', {
  id: text('id').primaryKey().default('default'),
  focusIndustries: text('focus_industries', { mode: 'json' }),
  focusCompanies: text('focus_companies', { mode: 'json' }),
  tierCriteria: text('tier_criteria', { mode: 'json' }),
  outreachTone: text('outreach_tone').default('professional'),
  autoApplyEnabled: integer('auto_apply_enabled', { mode: 'boolean' }).default(
    false,
  ),
  autoSendEnabled: integer('auto_send_enabled', { mode: 'boolean' }).default(
    false,
  ),
  notificationPreferences: text('notification_preferences', { mode: 'json' }),
  dailyBriefingTime: text('daily_briefing_time').default('08:00'),
  timezone: text('timezone').default('America/New_York'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ===========================================================================
// 11. AGENT LOGS
// ===========================================================================
export const agentLogs = sqliteTable('agent_logs', {
  id: id(),
  agent: text('agent'),
  worker: text('worker'),
  action: text('action'),
  status: text('status', {
    enum: ['running', 'completed', 'failed', 'cancelled'],
  }),
  inputSummary: text('input_summary'),
  outputSummary: text('output_summary'),
  error: text('error'),
  tokensUsed: integer('tokens_used'),
  costCents: real('cost_cents'),
  durationMs: integer('duration_ms'),
  inngestRunId: text('inngest_run_id'),
  createdAt: createdAt(),
  completedAt: text('completed_at'),
});

// ===========================================================================
// 12. AGENT MEMORY
// ===========================================================================
export const agentMemory = sqliteTable('agent_memory', {
  id: id(),
  agent: text('agent'),
  category: text('category', {
    enum: ['preference', 'pattern', 'fact', 'feedback'],
  }),
  content: text('content'),
  embedding: blob('embedding'),
  importance: real('importance').default(0.5),
  accessCount: integer('access_count').default(0),
  lastAccessedAt: text('last_accessed_at'),
  createdAt: createdAt(),
});

// ===========================================================================
// 13. DAILY SNAPSHOTS
// ===========================================================================
export const dailySnapshots = sqliteTable('daily_snapshots', {
  id: id(),
  date: text('date').unique().notNull(),
  totalApplications: integer('total_applications'),
  activePipeline: integer('active_pipeline'),
  interviewsScheduled: integer('interviews_scheduled'),
  offers: integer('offers'),
  rejections: integer('rejections'),
  emailsProcessed: integer('emails_processed'),
  agentsRuns: integer('agents_runs'),
  totalCostCents: integer('total_cost_cents'),
  createdAt: createdAt(),
});

// ===========================================================================
// 14. COMPANY EMBEDDINGS
// ===========================================================================
export const companyEmbeddings = sqliteTable('company_embeddings', {
  id: id(),
  companyId: text('company_id')
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: 'cascade' }),
  content: text('content'),
  embedding: blob('embedding'),
  createdAt: createdAt(),
});

// ===========================================================================
// 15. JOB EMBEDDINGS
// ===========================================================================
export const jobEmbeddings = sqliteTable('job_embeddings', {
  id: id(),
  applicationId: text('application_id')
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: 'cascade' }),
  content: text('content'),
  embedding: blob('embedding'),
  createdAt: createdAt(),
});

// ===========================================================================
// Inferred Types
// ===========================================================================
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

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

export type OutreachQueueItem = typeof outreachQueue.$inferSelect;
export type NewOutreachQueueItem = typeof outreachQueue.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;

export type AgentLog = typeof agentLogs.$inferSelect;
export type NewAgentLog = typeof agentLogs.$inferInsert;

export type AgentMemory = typeof agentMemory.$inferSelect;
export type NewAgentMemory = typeof agentMemory.$inferInsert;

export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type NewDailySnapshot = typeof dailySnapshots.$inferInsert;

export type CompanyEmbedding = typeof companyEmbeddings.$inferSelect;
export type NewCompanyEmbedding = typeof companyEmbeddings.$inferInsert;

export type JobEmbedding = typeof jobEmbeddings.$inferSelect;
export type NewJobEmbedding = typeof jobEmbeddings.$inferInsert;
