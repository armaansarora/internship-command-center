import {
  sqliteTable,
  text,
  integer,
  index,
  foreignKey,
} from 'drizzle-orm/sqlite-core';

export const applications = sqliteTable(
  'applications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    tier: text('tier', { enum: ['T1', 'T2', 'T3', 'T4'] }).notNull(),
    sector: text('sector', {
      enum: ['RE Finance', 'Real Estate', 'Finance', 'Other'],
    }).notNull(),
    status: text('status', {
      enum: [
        'applied',
        'in_progress',
        'interview',
        'under_review',
        'rejected',
        'offer',
      ],
    })
      .notNull()
      .default('applied'),
    appliedAt: integer('applied_at', { mode: 'timestamp' }).notNull(),
    platform: text('platform'),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactRole: text('contact_role'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_status').on(table.status),
    index('idx_tier').on(table.tier),
    index('idx_company').on(table.company),
    index('idx_applied_at').on(table.appliedAt),
  ]
);

export const companyResearch = sqliteTable('company_research', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyName: text('company_name').notNull().unique(),
  researchJson: text('research_json', { mode: 'json' }),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
});

export const followUps = sqliteTable('follow_ups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  note: text('note'),
  dismissed: integer('dismissed', { mode: 'boolean' }).default(false),
});

export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  company: text('company').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role'),
  relationshipType: text('relationship_type', {
    enum: ['recruiter', 'referral', 'alumni', 'cold_contact'],
  }).notNull(),
  introducedBy: integer('introduced_by'),
  lastContactedAt: integer('last_contacted_at', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  foreignKey({
    columns: [table.introducedBy],
    foreignColumns: [table.id],
    name: 'fk_contacts_introduced_by',
  }),
  index('idx_contacts_company').on(table.company),
  index('idx_contacts_last_contacted').on(table.lastContactedAt),
]);

export const coverLetters = sqliteTable(
  'cover_letters',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    applicationId: integer('application_id').references(
      () => applications.id,
      { onDelete: 'set null' }
    ),
    company: text('company').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(false),
    generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_cover_letters_company').on(table.company),
    index('idx_cover_letters_application').on(table.applicationId),
  ]
);

export const interviewPrep = sqliteTable(
  'interview_prep',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    applicationId: integer('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_interview_prep_application').on(table.applicationId),
  ]
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type CompanyResearch = typeof companyResearch.$inferSelect;
export type FollowUp = typeof followUps.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type CoverLetter = typeof coverLetters.$inferSelect;
export type InterviewPrep = typeof interviewPrep.$inferSelect;
