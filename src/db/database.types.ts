/**
 * Database row types — single source of truth for Supabase REST responses (Fix #5).
 *
 * Why this file exists
 * --------------------
 * Drizzle's `typeof table.$inferSelect` returns the table shape with TypeScript
 * **camelCase** keys (e.g. `{ userId, createdAt }`) because that is what we
 * write in `src/db/schema.ts`. The Supabase REST client returns the row in
 * **snake_case** (e.g. `{ user_id, created_at }`) because PostgREST mirrors the
 * SQL column names.
 *
 * Before this file, every `*-rest.ts` query hand-rolled its own
 * `interface ApplicationRow { user_id: string; … }` and the four interfaces
 * could drift from each other or from the live schema. After this file,
 * they all derive from a single SnakeKeyed mapper that compiles the
 * Drizzle table shape into the snake_case row Supabase REST actually sends.
 *
 * The mapper is type-level only — zero runtime cost, no codegen step.
 *
 * Adding a new table
 * ------------------
 * Add it to the `Tables` interface below and to `src/db/schema.ts`. The Row
 * helper picks it up automatically. Date columns are coerced to `string`
 * (ISO-8601) because Supabase REST serialises `timestamptz` as a string,
 * not a `Date` object.
 */

import type {
  agentDispatches,
  agentLogs,
  agentMemory,
  applications,
  auditLogs,
  baseResumes,
  calendarEvents,
  companies,
  companyCompBands,
  companyEmbeddings,
  compBandsBudget,
  contactEmbeddings,
  contacts,
  dailySnapshots,
  documents,
  emails,
  handoffDossiers,
  interviews,
  jobEmbeddings,
  matchCandidateIndex,
  matchEvents,
  matchRateLimits,
  networkingMatchIndex,
  notifications,
  offers,
  outreachQueue,
  progressionMilestones,
  rejectionReflections,
  stripeWebhookEvents,
  userProfiles,
} from "./schema";

// ---------------------------------------------------------------------------
// SnakeKeyed — type-level camelCase → snake_case key remapping.
// ---------------------------------------------------------------------------

/**
 * Recursive template-literal type that converts a camelCase string to
 * snake_case at the type level. The keys in Drizzle's `$inferSelect`
 * follow the pattern `userId`, `createdAt`, etc. — every uppercase letter
 * marks a word boundary that PostgREST returns as `_<lowercase>`.
 */
type SnakeCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Uppercase<Head>
    ? Head extends Lowercase<Head>
      ? `${Head}${SnakeCase<Tail>}`
      : `_${Lowercase<Head>}${SnakeCase<Tail>}`
    : `${Head}${SnakeCase<Tail>}`
  : S;

/** Map every key in T to its snake_case form, preserving value types. */
type SnakeKeyed<T> = {
  [K in keyof T as K extends string ? SnakeCase<K> : K]: T[K];
};

/**
 * `Date` columns in Drizzle's `$inferSelect` come back as `Date` objects when
 * read via Drizzle's own driver, but Supabase REST serialises them as ISO
 * strings. Coerce them at the type level so call-site code sees the actual
 * runtime shape.
 *
 * TypeScript distributes conditional types over unions, so `Date | null`
 * becomes `(Date extends Date ? string : Date) | (null extends Date ? string : null)`
 * = `string | null` — and a plain non-null `Date` becomes `string` without
 * accidentally widening to `string | null`.
 */
type DateToString<T> = T extends Date ? string : T;
type CoerceDates<T> = {
  [K in keyof T]: DateToString<T[K]>;
};

/** Public helper: snake_case + ISO-string-dated row type for a Drizzle table. */
type RowOf<T> = CoerceDates<SnakeKeyed<T>>;

// ---------------------------------------------------------------------------
// Tables — one entry per table in `src/db/schema.ts`. Add new tables here.
// ---------------------------------------------------------------------------

export interface Tables {
  agent_dispatches: RowOf<typeof agentDispatches.$inferSelect>;
  agent_logs: RowOf<typeof agentLogs.$inferSelect>;
  agent_memory: RowOf<typeof agentMemory.$inferSelect>;
  applications: RowOf<typeof applications.$inferSelect>;
  audit_logs: RowOf<typeof auditLogs.$inferSelect>;
  base_resumes: RowOf<typeof baseResumes.$inferSelect>;
  calendar_events: RowOf<typeof calendarEvents.$inferSelect>;
  companies: RowOf<typeof companies.$inferSelect>;
  company_comp_bands: RowOf<typeof companyCompBands.$inferSelect>;
  company_embeddings: RowOf<typeof companyEmbeddings.$inferSelect>;
  comp_bands_budget: RowOf<typeof compBandsBudget.$inferSelect>;
  contact_embeddings: RowOf<typeof contactEmbeddings.$inferSelect>;
  contacts: RowOf<typeof contacts.$inferSelect>;
  daily_snapshots: RowOf<typeof dailySnapshots.$inferSelect>;
  documents: RowOf<typeof documents.$inferSelect>;
  emails: RowOf<typeof emails.$inferSelect>;
  handoff_dossiers: RowOf<typeof handoffDossiers.$inferSelect>;
  interviews: RowOf<typeof interviews.$inferSelect>;
  job_embeddings: RowOf<typeof jobEmbeddings.$inferSelect>;
  match_candidate_index: RowOf<typeof matchCandidateIndex.$inferSelect>;
  match_events: RowOf<typeof matchEvents.$inferSelect>;
  match_rate_limits: RowOf<typeof matchRateLimits.$inferSelect>;
  networking_match_index: RowOf<typeof networkingMatchIndex.$inferSelect>;
  notifications: RowOf<typeof notifications.$inferSelect>;
  offers: RowOf<typeof offers.$inferSelect>;
  outreach_queue: RowOf<typeof outreachQueue.$inferSelect>;
  progression_milestones: RowOf<typeof progressionMilestones.$inferSelect>;
  rejection_reflections: RowOf<typeof rejectionReflections.$inferSelect>;
  stripe_webhook_events: RowOf<typeof stripeWebhookEvents.$inferSelect>;
  user_profiles: RowOf<typeof userProfiles.$inferSelect>;
}

/** Convenience: `Row<"applications">` reads more naturally than indexing Tables. */
export type Row<T extends keyof Tables> = Tables[T];
