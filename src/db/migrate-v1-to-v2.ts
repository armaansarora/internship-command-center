/**
 * V1 -> V2 Migration Script
 *
 * Migrates all 6 V1 tables to the 15-table V2 schema.
 * Operates on raw SQL via the libSQL client (not Drizzle ORM).
 *
 * 11-step migration order:
 *  1. Create V2 tables (rename colliding V1 tables first)
 *  2. Create _migration_id_map temp table
 *  3. Migrate companies (from company_research)
 *  4. Migrate applications
 *  5. Migrate contacts
 *  6. Migrate cover_letters -> documents
 *  7. Migrate follow_ups -> notifications + outreach_queue
 *  8. Migrate interview_prep -> interviews
 *  9. Verify referential integrity
 * 10. Drop _migration_id_map
 * 11. Rename remaining old tables with _v1_ prefix
 */

import type { Client } from '@libsql/client';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function epochToIso(epoch: number | null): string | null {
  if (epoch == null) return null;
  // Drizzle timestamp mode stores seconds (Unix epoch) as integers.
  // If the value looks like seconds (< 1e12), multiply by 1000.
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  return new Date(ms).toISOString();
}

function mapStatus(v1Status: string): string {
  const statusMap: Record<string, string> = {
    applied: 'applied',
    in_progress: 'screening',
    interview: 'interviewing',
    under_review: 'under_review',
    rejected: 'rejected',
    offer: 'offer',
  };
  return statusMap[v1Status] || 'discovered';
}

function mapTier(v1Tier: string): number | null {
  const tierMap: Record<string, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };
  return tierMap[v1Tier] ?? null;
}

function mapRelationship(v1Type: string): string {
  const relMap: Record<string, string> = {
    recruiter: 'recruiter',
    referral: 'referral',
    alumni: 'alumni',
    cold_contact: 'cold',
  };
  return relMap[v1Type] || 'cold';
}

// ---------------------------------------------------------------------------
// V2 Table DDL (all use TEXT PKs)
// ---------------------------------------------------------------------------

const V2_TABLE_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT, industry TEXT,
    sector TEXT, size TEXT, headquarters TEXT, description TEXT,
    culture_summary TEXT, recent_news TEXT, financials_summary TEXT,
    research_freshness TEXT, tier INTEGER, logo_url TEXT, careers_url TEXT,
    linkedin_url TEXT, glassdoor_url TEXT, sec_cik TEXT, key_people TEXT,
    internship_intel TEXT, your_connections TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  // applications & contacts have V2-only columns plus data-loss-prevention columns
  `CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    role TEXT NOT NULL, url TEXT,
    status TEXT NOT NULL DEFAULT 'discovered',
    tier INTEGER, applied_at TEXT, source TEXT, notes TEXT,
    salary TEXT, location TEXT,
    sector TEXT,
    contact_id TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL, email TEXT,
    phone TEXT,
    introduced_by TEXT,
    title TEXT, linkedin_url TEXT,
    relationship TEXT, warmth INTEGER DEFAULT 50,
    last_contact_at TEXT, notes TEXT, source TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY, gmail_id TEXT UNIQUE, thread_id TEXT,
    application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    from_address TEXT, to_address TEXT, subject TEXT, snippet TEXT,
    body_text TEXT, classification TEXT, urgency TEXT,
    suggested_action TEXT, is_read INTEGER DEFAULT 0,
    is_processed INTEGER DEFAULT 0, received_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    type TEXT, title TEXT, content TEXT,
    is_active INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    parent_id TEXT REFERENCES documents(id),
    generated_by TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    round TEXT, format TEXT, scheduled_at TEXT,
    duration_minutes INTEGER DEFAULT 60, location TEXT,
    interviewer_name TEXT, interviewer_title TEXT,
    interviewer_linkedin TEXT, status TEXT,
    prep_packet_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    debrief_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    calendar_event_id TEXT, notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY, google_event_id TEXT UNIQUE, title TEXT,
    description TEXT, start_at TEXT, end_at TEXT, location TEXT,
    interview_id TEXT REFERENCES interviews(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'google', created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS outreach_queue (
    id TEXT PRIMARY KEY,
    application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    type TEXT, subject TEXT, body TEXT,
    status TEXT NOT NULL DEFAULT 'pending_approval',
    generated_by TEXT, approved_at TEXT, sent_at TEXT,
    resend_message_id TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, type TEXT, priority TEXT, title TEXT, body TEXT,
    source_agent TEXT, source_entity_id TEXT, source_entity_type TEXT,
    channels TEXT, is_read INTEGER DEFAULT 0,
    is_dismissed INTEGER DEFAULT 0, actions TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY DEFAULT 'default',
    focus_industries TEXT, focus_companies TEXT, tier_criteria TEXT,
    outreach_tone TEXT DEFAULT 'professional',
    auto_apply_enabled INTEGER DEFAULT 0,
    auto_send_enabled INTEGER DEFAULT 0,
    notification_preferences TEXT,
    daily_briefing_time TEXT DEFAULT '08:00',
    timezone TEXT DEFAULT 'America/New_York',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS agent_logs (
    id TEXT PRIMARY KEY, agent TEXT, worker TEXT, action TEXT,
    status TEXT, input_summary TEXT, output_summary TEXT, error TEXT,
    tokens_used INTEGER, cost_cents REAL, duration_ms INTEGER,
    inngest_run_id TEXT, created_at TEXT NOT NULL, completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS agent_memory (
    id TEXT PRIMARY KEY, agent TEXT, category TEXT, content TEXT,
    embedding BLOB, importance REAL DEFAULT 0.5,
    access_count INTEGER DEFAULT 0, last_accessed_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS daily_snapshots (
    id TEXT PRIMARY KEY, date TEXT UNIQUE NOT NULL,
    total_applications INTEGER, active_pipeline INTEGER,
    interviews_scheduled INTEGER, offers INTEGER, rejections INTEGER,
    emails_processed INTEGER, agents_runs INTEGER,
    total_cost_cents INTEGER, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS company_embeddings (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    content TEXT, embedding BLOB, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS job_embeddings (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    content TEXT, embedding BLOB, created_at TEXT NOT NULL
  )`,
];

const V2_INDEXES: string[] = [
  'CREATE INDEX IF NOT EXISTS idx_companies_tier ON companies(tier)',
  'CREATE INDEX IF NOT EXISTS idx_v2_applications_status ON applications(status)',
  'CREATE INDEX IF NOT EXISTS idx_v2_applications_company_id ON applications(company_id)',
  'CREATE INDEX IF NOT EXISTS idx_v2_applications_tier ON applications(tier)',
  'CREATE INDEX IF NOT EXISTS idx_v2_applications_created_at ON applications(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_v2_contacts_company_id ON contacts(company_id)',
  'CREATE INDEX IF NOT EXISTS idx_v2_contacts_warmth ON contacts(warmth)',
  'CREATE INDEX IF NOT EXISTS idx_v2_emails_gmail_id ON emails(gmail_id)',
  'CREATE INDEX IF NOT EXISTS idx_v2_emails_classification ON emails(classification)',
  'CREATE INDEX IF NOT EXISTS idx_v2_emails_application_id ON emails(application_id)',
  'CREATE INDEX IF NOT EXISTS idx_v2_documents_application_id ON documents(application_id)',
  'CREATE INDEX IF NOT EXISTS idx_v2_documents_type ON documents(type)',
  'CREATE INDEX IF NOT EXISTS idx_v2_interviews_application_id ON interviews(application_id)',
  'CREATE INDEX IF NOT EXISTS idx_v2_interviews_scheduled_at ON interviews(scheduled_at)',
  'CREATE INDEX IF NOT EXISTS idx_v2_calendar_events_start_at ON calendar_events(start_at)',
  'CREATE INDEX IF NOT EXISTS idx_v2_calendar_events_google_event_id ON calendar_events(google_event_id)',
  'CREATE INDEX IF NOT EXISTS idx_v2_outreach_queue_status ON outreach_queue(status)',
  'CREATE INDEX IF NOT EXISTS idx_v2_outreach_queue_created_at ON outreach_queue(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_v2_notifications_is_read ON notifications(is_read)',
  'CREATE INDEX IF NOT EXISTS idx_v2_notifications_created_at ON notifications(created_at)',
];

// V1 tables that share names with V2 tables. These must be renamed before
// V2 tables are created, because V1 uses INTEGER PRIMARY KEY which cannot
// accept TEXT ids.
const COLLIDING_TABLES = ['applications', 'contacts'];

// V1-only tables (no name collision with V2)
const NON_COLLIDING_V1_TABLES = [
  'company_research',
  'follow_ups',
  'cover_letters',
  'interview_prep',
];

// ---------------------------------------------------------------------------
// Migration entry point
// ---------------------------------------------------------------------------

export interface MigrationResult {
  success: boolean;
  steps: StepResult[];
  error?: string;
}

interface StepResult {
  step: number;
  name: string;
  success: boolean;
  rowsMigrated?: number;
  error?: string;
}

export async function migrateV1ToV2(client: Client): Promise<MigrationResult> {
  const steps: StepResult[] = [];

  // Idempotency: if _v1_applications already exists, migration already ran
  const alreadyMigrated = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='_v1_applications'`
  );
  if (alreadyMigrated.rows.length > 0) {
    return {
      success: true,
      steps: [{ step: 0, name: 'idempotency_check', success: true, rowsMigrated: 0 }],
    };
  }

  try {
    steps.push(await step1_createV2Tables(client));
    steps.push(await step2_createIdMap(client));
    steps.push(await step3_migrateCompanies(client));
    steps.push(await step4_migrateApplications(client));
    steps.push(await step5_migrateContacts(client));
    steps.push(await step6_migrateCoverLetters(client));
    steps.push(await step7_migrateFollowUps(client));
    steps.push(await step8_migrateInterviewPrep(client));
    steps.push(await step9_verifyIntegrity(client));
    steps.push(await step10_dropIdMap(client));
    steps.push(await step11_renameOldTables(client));

    const allSuccess = steps.every((s) => s.success);
    return { success: allSuccess, steps };
  } catch (err) {
    return {
      success: false,
      steps,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Step implementations
// ---------------------------------------------------------------------------

async function step1_createV2Tables(client: Client): Promise<StepResult> {
  try {
    // Rename colliding V1 tables first so the V2 DDL can create fresh tables
    // with TEXT PRIMARY KEYs. The V1 data is preserved under _v1_ prefix and
    // migration steps read from the renamed tables.
    for (const table of COLLIDING_TABLES) {
      const exists = await client.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      );
      if (exists.rows.length > 0) {
        await client.execute(`ALTER TABLE ${table} RENAME TO _v1_${table}`);
      }
    }

    // Now create all V2 tables (applications & contacts are fresh)
    for (const ddl of V2_TABLE_DDL) {
      await client.execute(ddl);
    }
    for (const idx of V2_INDEXES) {
      await client.execute(idx);
    }

    return { step: 1, name: 'create_v2_tables', success: true };
  } catch (err) {
    return {
      step: 1, name: 'create_v2_tables', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step2_createIdMap(client: Client): Promise<StepResult> {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS _migration_id_map (
        old_table TEXT NOT NULL,
        old_id INTEGER NOT NULL,
        new_id TEXT NOT NULL,
        PRIMARY KEY (old_table, old_id)
      )
    `);
    return { step: 2, name: 'create_id_map', success: true };
  } catch (err) {
    return {
      step: 2, name: 'create_id_map', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step3_migrateCompanies(client: Client): Promise<StepResult> {
  try {
    const rows = await client.execute(
      `SELECT id, company_name, research_json, fetched_at FROM company_research`
    );
    let count = 0;
    const now = new Date().toISOString();

    for (const row of rows.rows) {
      const newId = generateId();
      const oldId = row.id as number;

      let industry: string | null = null;
      let sector: string | null = null;
      let description: string | null = null;
      if (row.research_json) {
        try {
          const research =
            typeof row.research_json === 'string'
              ? JSON.parse(row.research_json)
              : row.research_json;
          industry = research.industry ?? null;
          sector = research.sector ?? null;
          description = research.description ?? null;
        } catch { /* ignore parse errors */ }
      }

      await client.execute({
        sql: `INSERT INTO companies (id, name, industry, sector, description, research_freshness, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newId, row.company_name as string, industry, sector, description,
               epochToIso(row.fetched_at as number), now, now],
      });

      await client.execute({
        sql: `INSERT INTO _migration_id_map (old_table, old_id, new_id) VALUES (?, ?, ?)`,
        args: ['company_research', oldId, newId],
      });
      count++;
    }

    return { step: 3, name: 'migrate_companies', success: true, rowsMigrated: count };
  } catch (err) {
    return {
      step: 3, name: 'migrate_companies', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step4_migrateApplications(client: Client): Promise<StepResult> {
  try {
    // Read from renamed V1 table
    const rows = await client.execute(`SELECT * FROM _v1_applications`);
    let count = 0;
    const now = new Date().toISOString();

    for (const row of rows.rows) {
      const newId = generateId();
      const oldId = row.id as number;
      const companyName = row.company as string;

      // Resolve company_id by name
      const companyLookup = await client.execute({
        sql: `SELECT id FROM companies WHERE name = ? LIMIT 1`,
        args: [companyName],
      });
      const companyId = companyLookup.rows.length > 0
        ? (companyLookup.rows[0].id as string)
        : null;

      // Risk #8: Create contact from inline contact fields
      let contactId: string | null = null;
      const contactName = row.contact_name as string | null;
      if (contactName) {
        contactId = generateId();
        await client.execute({
          sql: `INSERT INTO contacts (id, company_id, name, email, title, relationship, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [contactId, companyId, contactName,
                 (row.contact_email as string) ?? null,
                 (row.contact_role as string) ?? null,
                 'recruiter', now, now],
        });
        await client.execute({
          sql: `INSERT INTO _migration_id_map (old_table, old_id, new_id) VALUES (?, ?, ?)`,
          args: ['inline_contact', oldId, contactId],
        });
      }

      await client.execute({
        sql: `INSERT INTO applications (id, company_id, role, status, tier, applied_at, source, notes, sector, contact_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newId, companyId, row.role as string,
          mapStatus(row.status as string),
          mapTier(row.tier as string),
          epochToIso(row.applied_at as number),
          (row.platform as string) ?? null,  // Risk #6: platform -> source
          (row.notes as string) ?? null,
          (row.sector as string) ?? null,    // Risk #7: sector preserved
          contactId,                          // Risk #8: contact_id FK
          epochToIso(row.created_at as number) ?? now,
          epochToIso(row.updated_at as number) ?? now,
        ],
      });

      await client.execute({
        sql: `INSERT INTO _migration_id_map (old_table, old_id, new_id) VALUES (?, ?, ?)`,
        args: ['applications', oldId, newId],
      });
      count++;
    }

    return { step: 4, name: 'migrate_applications', success: true, rowsMigrated: count };
  } catch (err) {
    return {
      step: 4, name: 'migrate_applications', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step5_migrateContacts(client: Client): Promise<StepResult> {
  try {
    // Read from renamed V1 table
    const rows = await client.execute(`SELECT * FROM _v1_contacts`);
    let count = 0;
    const now = new Date().toISOString();

    const introducedByMap: Map<number, number> = new Map();

    for (const row of rows.rows) {
      const newId = generateId();
      const oldId = row.id as number;
      const companyName = row.company as string;

      const companyLookup = await client.execute({
        sql: `SELECT id FROM companies WHERE name = ? LIMIT 1`,
        args: [companyName],
      });
      const companyId = companyLookup.rows.length > 0
        ? (companyLookup.rows[0].id as string)
        : null;

      const introducedBy = row.introduced_by as number | null;
      if (introducedBy != null) {
        introducedByMap.set(oldId, introducedBy);
      }

      await client.execute({
        sql: `INSERT INTO contacts (id, company_id, name, email, phone, title, relationship, last_contact_at, notes, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newId, companyId, row.name as string,
          (row.email as string) ?? null,
          (row.phone as string) ?? null,     // Risk #1: phone preserved
          (row.role as string) ?? null,
          mapRelationship(row.relationship_type as string),
          epochToIso(row.last_contacted_at as number),
          (row.notes as string) ?? null,
          epochToIso(row.created_at as number) ?? now,
          epochToIso(row.updated_at as number) ?? now,
        ],
      });

      await client.execute({
        sql: `INSERT INTO _migration_id_map (old_table, old_id, new_id) VALUES (?, ?, ?)`,
        args: ['contacts', oldId, newId],
      });
      count++;
    }

    // Second pass: resolve introduced_by references (Risk #2)
    for (const [contactOldId, introducedByOldId] of introducedByMap) {
      const contactNewId = await client.execute({
        sql: `SELECT new_id FROM _migration_id_map WHERE old_table = 'contacts' AND old_id = ?`,
        args: [contactOldId],
      });
      const introducedByNewId = await client.execute({
        sql: `SELECT new_id FROM _migration_id_map WHERE old_table = 'contacts' AND old_id = ?`,
        args: [introducedByOldId],
      });

      if (contactNewId.rows.length > 0 && introducedByNewId.rows.length > 0) {
        await client.execute({
          sql: `UPDATE contacts SET introduced_by = ? WHERE id = ?`,
          args: [introducedByNewId.rows[0].new_id as string,
                 contactNewId.rows[0].new_id as string],
        });
      }
    }

    return { step: 5, name: 'migrate_contacts', success: true, rowsMigrated: count };
  } catch (err) {
    return {
      step: 5, name: 'migrate_contacts', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step6_migrateCoverLetters(client: Client): Promise<StepResult> {
  try {
    const rows = await client.execute(`SELECT * FROM cover_letters`);
    let count = 0;
    const now = new Date().toISOString();

    for (const row of rows.rows) {
      const newId = generateId();
      const oldId = row.id as number;

      // Resolve application_id via mapping
      let applicationId: string | null = null;
      const oldAppId = row.application_id as number | null;
      if (oldAppId != null) {
        const appLookup = await client.execute({
          sql: `SELECT new_id FROM _migration_id_map WHERE old_table = 'applications' AND old_id = ?`,
          args: [oldAppId],
        });
        applicationId = appLookup.rows.length > 0
          ? (appLookup.rows[0].new_id as string) : null;
      }

      // Resolve company_id via application
      let companyId: string | null = null;
      if (applicationId) {
        const cl = await client.execute({
          sql: `SELECT company_id FROM applications WHERE id = ?`,
          args: [applicationId],
        });
        companyId = cl.rows.length > 0 ? (cl.rows[0].company_id as string) : null;
      }

      // Risk #4: role/company preserved in title
      const title = `Cover Letter - ${row.company as string} - ${row.role as string}`;

      await client.execute({
        sql: `INSERT INTO documents (id, application_id, company_id, type, title, content, is_active, generated_by, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newId, applicationId, companyId, 'cover_letter', title,
          (row.content as string) ?? null,
          (row.is_active as number) ?? 0,  // Risk #3: is_active preserved
          'v1_migration',
          epochToIso(row.created_at as number) ?? now, now,
        ],
      });

      await client.execute({
        sql: `INSERT INTO _migration_id_map (old_table, old_id, new_id) VALUES (?, ?, ?)`,
        args: ['cover_letters', oldId, newId],
      });
      count++;
    }

    return { step: 6, name: 'migrate_cover_letters', success: true, rowsMigrated: count };
  } catch (err) {
    return {
      step: 6, name: 'migrate_cover_letters', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step7_migrateFollowUps(client: Client): Promise<StepResult> {
  try {
    // Risk #5: entire follow_ups table migrated
    // Join against _v1_applications for company/role context
    const rows = await client.execute(`
      SELECT f.*, a.company, a.role
      FROM follow_ups f
      LEFT JOIN _v1_applications a ON f.application_id = a.id
    `);
    let count = 0;
    const now = new Date().toISOString();

    for (const row of rows.rows) {
      const newId = generateId();
      const oldId = row.id as number;
      const note = (row.note as string) ?? '';

      // Resolve application_id
      let applicationId: string | null = null;
      const oldAppId = row.application_id as number | null;
      if (oldAppId != null) {
        const appLookup = await client.execute({
          sql: `SELECT new_id FROM _migration_id_map WHERE old_table = 'applications' AND old_id = ?`,
          args: [oldAppId],
        });
        applicationId = appLookup.rows.length > 0
          ? (appLookup.rows[0].new_id as string) : null;
      }

      const isOutreach = /follow.?up|outreach|reach out|email|contact/i.test(note);

      if (isOutreach) {
        const status = row.completed_at != null ? 'sent'
          : row.dismissed ? 'expired' : 'pending_approval';

        await client.execute({
          sql: `INSERT INTO outreach_queue (id, application_id, type, body, status, generated_by, sent_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [newId, applicationId, 'follow_up', note, status,
                 'v1_migration', epochToIso(row.completed_at as number),
                 epochToIso(row.due_at as number) ?? now],
        });
      } else {
        const companyName = (row.company as string) ?? 'Unknown';
        const roleName = (row.role as string) ?? '';
        const title = `Follow-up: ${companyName}${roleName ? ` - ${roleName}` : ''}`;

        await client.execute({
          sql: `INSERT INTO notifications (id, type, priority, title, body, source_entity_id, source_entity_type, is_read, is_dismissed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [newId, 'follow_up_reminder', 'medium', title,
                 note || `Follow-up due for ${companyName}`,
                 applicationId, 'application',
                 row.completed_at != null ? 1 : 0,
                 row.dismissed ? 1 : 0,
                 epochToIso(row.due_at as number) ?? now],
        });
      }

      await client.execute({
        sql: `INSERT INTO _migration_id_map (old_table, old_id, new_id) VALUES (?, ?, ?)`,
        args: ['follow_ups', oldId, newId],
      });
      count++;
    }

    return { step: 7, name: 'migrate_follow_ups', success: true, rowsMigrated: count };
  } catch (err) {
    return {
      step: 7, name: 'migrate_follow_ups', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step8_migrateInterviewPrep(client: Client): Promise<StepResult> {
  try {
    const rows = await client.execute(`SELECT * FROM interview_prep`);
    let count = 0;
    const now = new Date().toISOString();

    for (const row of rows.rows) {
      const newId = generateId();
      const oldId = row.id as number;

      let applicationId: string | null = null;
      let companyId: string | null = null;
      const oldAppId = row.application_id as number;
      const appLookup = await client.execute({
        sql: `SELECT new_id FROM _migration_id_map WHERE old_table = 'applications' AND old_id = ?`,
        args: [oldAppId],
      });
      if (appLookup.rows.length > 0) {
        applicationId = appLookup.rows[0].new_id as string;
        const cl = await client.execute({
          sql: `SELECT company_id FROM applications WHERE id = ?`,
          args: [applicationId],
        });
        if (cl.rows.length > 0) companyId = cl.rows[0].company_id as string;
      }

      if (!applicationId) continue; // NOT NULL constraint

      await client.execute({
        sql: `INSERT INTO interviews (id, application_id, company_id, notes, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [newId, applicationId, companyId,
               (row.content as string) ?? null, 'scheduled',
               epochToIso(row.created_at as number) ?? now, now],
      });

      // Also create a prep_packet document
      const docId = generateId();
      await client.execute({
        sql: `INSERT INTO documents (id, application_id, company_id, type, title, content, generated_by, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [docId, applicationId, companyId, 'prep_packet',
               'Interview Prep (migrated)', (row.content as string) ?? null,
               'v1_migration', epochToIso(row.created_at as number) ?? now, now],
      });

      // Link prep_packet to interview
      await client.execute({
        sql: `UPDATE interviews SET prep_packet_id = ? WHERE id = ?`,
        args: [docId, newId],
      });

      await client.execute({
        sql: `INSERT INTO _migration_id_map (old_table, old_id, new_id) VALUES (?, ?, ?)`,
        args: ['interview_prep', oldId, newId],
      });
      count++;
    }

    return { step: 8, name: 'migrate_interview_prep', success: true, rowsMigrated: count };
  } catch (err) {
    return {
      step: 8, name: 'migrate_interview_prep', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step9_verifyIntegrity(client: Client): Promise<StepResult> {
  try {
    const checks = [
      `SELECT COUNT(*) as cnt FROM applications WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies)`,
      `SELECT COUNT(*) as cnt FROM contacts WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies)`,
      `SELECT COUNT(*) as cnt FROM documents WHERE application_id IS NOT NULL AND application_id NOT IN (SELECT id FROM applications)`,
      `SELECT COUNT(*) as cnt FROM documents WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies)`,
      `SELECT COUNT(*) as cnt FROM interviews WHERE application_id NOT IN (SELECT id FROM applications)`,
      `SELECT COUNT(*) as cnt FROM outreach_queue WHERE application_id IS NOT NULL AND application_id NOT IN (SELECT id FROM applications)`,
      `SELECT COUNT(*) as cnt FROM notifications WHERE source_entity_type = 'application' AND source_entity_id IS NOT NULL AND source_entity_id NOT IN (SELECT id FROM applications)`,
    ];

    const violations: string[] = [];
    for (const sql of checks) {
      const result = await client.execute(sql);
      const cnt = result.rows[0]?.cnt as number;
      if (cnt > 0) violations.push(`${sql}: ${cnt} violations`);
    }

    if (violations.length > 0) {
      return {
        step: 9, name: 'verify_integrity', success: false,
        error: `Referential integrity violations:\n${violations.join('\n')}`,
      };
    }

    return { step: 9, name: 'verify_integrity', success: true };
  } catch (err) {
    return {
      step: 9, name: 'verify_integrity', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step10_dropIdMap(client: Client): Promise<StepResult> {
  try {
    await client.execute(`DROP TABLE IF EXISTS _migration_id_map`);
    return { step: 10, name: 'drop_id_map', success: true };
  } catch (err) {
    return {
      step: 10, name: 'drop_id_map', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function step11_renameOldTables(client: Client): Promise<StepResult> {
  try {
    // Colliding tables (applications, contacts) were already renamed to
    // _v1_* in step 1. Now rename the non-colliding V1 tables.
    for (const table of NON_COLLIDING_V1_TABLES) {
      const exists = await client.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      );
      if (exists.rows.length > 0) {
        await client.execute(`ALTER TABLE ${table} RENAME TO _v1_${table}`);
      }
    }

    return { step: 11, name: 'rename_old_tables', success: true };
  } catch (err) {
    return {
      step: 11, name: 'rename_old_tables', success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
