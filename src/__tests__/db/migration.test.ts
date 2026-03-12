import { describe, it, expect, beforeEach } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { migrateV1ToV2 } from '../../db/migrate-v1-to-v2';

// ---------------------------------------------------------------------------
// V1 DDL
// ---------------------------------------------------------------------------

const V1_DDL = [
  `CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL, role TEXT NOT NULL, tier TEXT NOT NULL,
    sector TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'applied',
    applied_at INTEGER NOT NULL, platform TEXT,
    contact_name TEXT, contact_email TEXT, contact_role TEXT,
    notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE company_research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL UNIQUE, research_json TEXT,
    fetched_at INTEGER NOT NULL
  )`,
  `CREATE TABLE follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    due_at INTEGER NOT NULL, completed_at INTEGER, note TEXT,
    dismissed INTEGER DEFAULT 0
  )`,
  `CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, company TEXT NOT NULL, email TEXT, phone TEXT,
    role TEXT, relationship_type TEXT NOT NULL, introduced_by INTEGER,
    last_contacted_at INTEGER, notes TEXT,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE cover_letters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    company TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
    is_active INTEGER DEFAULT 0, generated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE interview_prep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    content TEXT NOT NULL, generated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

// ---------------------------------------------------------------------------
// Seed data helpers
// ---------------------------------------------------------------------------

function epochSec(isoDate: string): number {
  return Math.floor(new Date(isoDate).getTime() / 1000);
}

async function seedV1Data(client: Client) {
  // Companies
  await client.execute({
    sql: `INSERT INTO company_research (id, company_name, research_json, fetched_at) VALUES (?, ?, ?, ?)`,
    args: [1, 'Acme Corp', JSON.stringify({ industry: 'Technology', sector: 'SaaS', description: 'Enterprise SaaS' }), epochSec('2025-01-15T10:00:00Z')],
  });
  await client.execute({
    sql: `INSERT INTO company_research (id, company_name, research_json, fetched_at) VALUES (?, ?, ?, ?)`,
    args: [2, 'Big Bank', null, epochSec('2025-02-01T10:00:00Z')],
  });

  // Applications
  await client.execute({
    sql: `INSERT INTO applications (id, company, role, tier, sector, status, applied_at, platform, contact_name, contact_email, contact_role, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [1, 'Acme Corp', 'Software Engineer Intern', 'T1', 'Finance', 'interview', epochSec('2025-01-20T09:00:00Z'), 'LinkedIn', 'Jane Doe', 'jane@acme.com', 'Recruiter', 'Great opportunity', epochSec('2025-01-20T09:00:00Z'), epochSec('2025-02-10T12:00:00Z')],
  });
  await client.execute({
    sql: `INSERT INTO applications (id, company, role, tier, sector, status, applied_at, platform, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    args: [2, 'Big Bank', 'Analyst Intern', 'T2', 'RE Finance', 'applied', epochSec('2025-02-05T10:00:00Z'), 'Handshake', null, epochSec('2025-02-05T10:00:00Z'), epochSec('2025-02-05T10:00:00Z')],
  });
  await client.execute({
    sql: `INSERT INTO applications (id, company, role, tier, sector, status, applied_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [3, 'Startup XYZ', 'Full Stack Dev', 'T3', 'Other', 'rejected', epochSec('2025-03-01T10:00:00Z'), epochSec('2025-03-01T10:00:00Z'), epochSec('2025-03-01T10:00:00Z')],
  });

  // Contacts (with referral chain)
  await client.execute({
    sql: `INSERT INTO contacts (id, name, company, email, phone, role, relationship_type, introduced_by, last_contacted_at, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [1, 'Alice Smith', 'Acme Corp', 'alice@acme.com', '555-0100', 'VP Engineering', 'alumni', null, epochSec('2025-02-01T10:00:00Z'), 'Met at alumni event', epochSec('2025-01-10T10:00:00Z'), epochSec('2025-02-01T10:00:00Z')],
  });
  await client.execute({
    sql: `INSERT INTO contacts (id, name, company, email, phone, role, relationship_type, introduced_by, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    args: [2, 'Bob Jones', 'Acme Corp', 'bob@acme.com', '555-0200', 'Team Lead', 'referral', 1, 'Referred by Alice', epochSec('2025-01-15T10:00:00Z'), epochSec('2025-01-15T10:00:00Z')],
  });

  // Cover letters
  await client.execute({
    sql: `INSERT INTO cover_letters (id, application_id, company, role, content, is_active, generated_at, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    args: [1, 1, 'Acme Corp', 'Software Engineer Intern', 'Dear Hiring Manager, I am excited...', 1, epochSec('2025-01-20T10:00:00Z'), epochSec('2025-01-20T10:00:00Z')],
  });
  await client.execute({
    sql: `INSERT INTO cover_letters (id, application_id, company, role, content, is_active, generated_at, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    args: [2, 1, 'Acme Corp', 'Software Engineer Intern', 'Dear Team, Second version...', 0, epochSec('2025-01-21T10:00:00Z'), epochSec('2025-01-21T10:00:00Z')],
  });

  // Follow-ups
  await client.execute({
    sql: `INSERT INTO follow_ups (id, application_id, due_at, completed_at, note, dismissed) VALUES (?,?,?,?,?,?)`,
    args: [1, 1, epochSec('2025-02-15T10:00:00Z'), null, 'Follow up with recruiter about status', 0],
  });
  await client.execute({
    sql: `INSERT INTO follow_ups (id, application_id, due_at, completed_at, note, dismissed) VALUES (?,?,?,?,?,?)`,
    args: [2, 2, epochSec('2025-02-20T10:00:00Z'), epochSec('2025-02-20T15:00:00Z'), 'Check application portal', 0],
  });
  await client.execute({
    sql: `INSERT INTO follow_ups (id, application_id, due_at, completed_at, note, dismissed) VALUES (?,?,?,?,?,?)`,
    args: [3, 1, epochSec('2025-02-25T10:00:00Z'), null, 'Send follow-up email to hiring manager', 1],
  });

  // Interview prep
  await client.execute({
    sql: `INSERT INTO interview_prep (id, application_id, content, generated_at, created_at) VALUES (?,?,?,?,?)`,
    args: [1, 1, '# Acme Corp Interview Prep\n\n## Key Topics\n- System design\n- REST APIs', epochSec('2025-02-10T10:00:00Z'), epochSec('2025-02-10T10:00:00Z')],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('V1 -> V2 Migration', () => {
  let client: Client;

  beforeEach(async () => {
    client = createClient({ url: ':memory:' });
    for (const ddl of V1_DDL) {
      await client.execute(ddl);
    }
    await seedV1Data(client);
  });

  it('completes all 11 steps successfully', async () => {
    const result = await migrateV1ToV2(client);
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(11);
    for (const step of result.steps) {
      expect(step.success).toBe(true);
    }
  });

  it('is idempotent -- running twice returns early', async () => {
    const first = await migrateV1ToV2(client);
    expect(first.success).toBe(true);

    const second = await migrateV1ToV2(client);
    expect(second.success).toBe(true);
    expect(second.steps).toHaveLength(1);
    expect(second.steps[0].name).toBe('idempotency_check');
  });

  // -----------------------------------------------------------------------
  // Data Loss Risk tests
  // -----------------------------------------------------------------------

  describe('Risk #1: contacts.phone preserved', () => {
    it('migrates phone numbers to V2 contacts', async () => {
      await migrateV1ToV2(client);
      const result = await client.execute(
        `SELECT phone FROM contacts WHERE phone IS NOT NULL`
      );
      const phones = result.rows.map((r) => r.phone as string);
      expect(phones).toContain('555-0100');
      expect(phones).toContain('555-0200');
    });
  });

  describe('Risk #2: contacts.introduced_by referral chain', () => {
    it('preserves introduced_by as TEXT FK reference', async () => {
      await migrateV1ToV2(client);
      const bob = await client.execute(
        `SELECT c.introduced_by, c2.name as introducer_name
         FROM contacts c
         LEFT JOIN contacts c2 ON c.introduced_by = c2.id
         WHERE c.name = 'Bob Jones'`
      );
      expect(bob.rows.length).toBe(1);
      expect(bob.rows[0].introduced_by).not.toBeNull();
      expect(bob.rows[0].introducer_name).toBe('Alice Smith');
    });
  });

  describe('Risk #3: cover_letters.is_active preserved', () => {
    it('migrates is_active flag to documents', async () => {
      await migrateV1ToV2(client);
      const docs = await client.execute(
        `SELECT is_active FROM documents WHERE type = 'cover_letter' ORDER BY is_active DESC`
      );
      expect(docs.rows.length).toBe(2);
      const activeDocs = docs.rows.filter((r) => r.is_active === 1);
      expect(activeDocs.length).toBe(1);
      const inactiveDocs = docs.rows.filter((r) => r.is_active === 0 || r.is_active === null);
      expect(inactiveDocs.length).toBe(1);
    });
  });

  describe('Risk #4: cover_letters.role/company via application_id', () => {
    it('preserves role and company in document title', async () => {
      await migrateV1ToV2(client);
      const docs = await client.execute(
        `SELECT title FROM documents WHERE type = 'cover_letter'`
      );
      expect(docs.rows.length).toBe(2);
      const titles = docs.rows.map((r) => r.title as string);
      expect(titles.some((t) => t.includes('Acme Corp') && t.includes('Software Engineer Intern'))).toBe(true);
    });

    it('links documents to applications via application_id', async () => {
      await migrateV1ToV2(client);
      const docs = await client.execute(
        `SELECT d.application_id, a.role
         FROM documents d JOIN applications a ON d.application_id = a.id
         WHERE d.type = 'cover_letter'`
      );
      expect(docs.rows.length).toBe(2);
      expect(docs.rows[0].role).toBe('Software Engineer Intern');
    });
  });

  describe('Risk #5: follow_ups split into notifications + outreach_queue', () => {
    it('routes outreach-type follow-ups to outreach_queue', async () => {
      await migrateV1ToV2(client);
      const outreach = await client.execute(
        `SELECT * FROM outreach_queue WHERE type = 'follow_up'`
      );
      expect(outreach.rows.length).toBeGreaterThanOrEqual(1);
      const expired = outreach.rows.filter((r) => r.status === 'expired');
      expect(expired.length).toBeGreaterThanOrEqual(1);
    });

    it('routes non-outreach follow-ups to notifications', async () => {
      await migrateV1ToV2(client);
      const notifs = await client.execute(
        `SELECT * FROM notifications WHERE type = 'follow_up_reminder'`
      );
      expect(notifs.rows.length).toBeGreaterThanOrEqual(1);
      const readNotifs = notifs.rows.filter((r) => r.is_read === 1);
      expect(readNotifs.length).toBeGreaterThanOrEqual(1);
    });

    it('preserves all follow_up records (none lost)', async () => {
      await migrateV1ToV2(client);
      const outreach = await client.execute(`SELECT COUNT(*) as cnt FROM outreach_queue`);
      const notifs = await client.execute(`SELECT COUNT(*) as cnt FROM notifications`);
      const total = (outreach.rows[0].cnt as number) + (notifs.rows[0].cnt as number);
      expect(total).toBe(3);
    });
  });

  describe('Risk #6: applications.platform -> source', () => {
    it('maps platform to source field', async () => {
      await migrateV1ToV2(client);
      const apps = await client.execute(`SELECT source FROM applications WHERE source IS NOT NULL`);
      const sources = apps.rows.map((r) => r.source as string);
      expect(sources).toContain('LinkedIn');
      expect(sources).toContain('Handshake');
    });
  });

  describe('Risk #7: applications.sector preserved', () => {
    it('preserves sector in V2 applications', async () => {
      await migrateV1ToV2(client);
      const apps = await client.execute(`SELECT sector FROM applications WHERE sector IS NOT NULL`);
      const sectors = apps.rows.map((r) => r.sector as string);
      expect(sectors).toContain('Finance');
      expect(sectors).toContain('RE Finance');
    });
  });

  describe('Risk #8: inline contact_name/email/role -> contacts', () => {
    it('creates contact records from inline application fields', async () => {
      await migrateV1ToV2(client);
      const jane = await client.execute(`SELECT * FROM contacts WHERE name = 'Jane Doe'`);
      expect(jane.rows.length).toBe(1);
      expect(jane.rows[0].email).toBe('jane@acme.com');
      expect(jane.rows[0].title).toBe('Recruiter');
    });

    it('links inline contact to application via contact_id', async () => {
      await migrateV1ToV2(client);
      const apps = await client.execute(
        `SELECT a.contact_id, c.name
         FROM applications a JOIN contacts c ON a.contact_id = c.id
         WHERE a.contact_id IS NOT NULL`
      );
      expect(apps.rows.length).toBeGreaterThanOrEqual(1);
      expect(apps.rows[0].name).toBe('Jane Doe');
    });

    it('does not create contacts when inline fields are null', async () => {
      await migrateV1ToV2(client);
      const allContacts = await client.execute(`SELECT name FROM contacts`);
      const names = allContacts.rows.map((r) => r.name as string);
      expect(names).toContain('Alice Smith');
      expect(names).toContain('Bob Jones');
      expect(names).toContain('Jane Doe');
      expect(names.filter((n) => n === 'Jane Doe').length).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Structural migration tests
  // -----------------------------------------------------------------------

  describe('Step 3: companies migration', () => {
    it('migrates company_research to companies', async () => {
      await migrateV1ToV2(client);
      const companies = await client.execute(`SELECT * FROM companies ORDER BY name`);
      expect(companies.rows.length).toBe(2);
      expect(companies.rows[0].name).toBe('Acme Corp');
      expect(companies.rows[1].name).toBe('Big Bank');
    });

    it('parses research_json for industry/sector/description', async () => {
      await migrateV1ToV2(client);
      const acme = await client.execute(
        `SELECT industry, sector, description FROM companies WHERE name = 'Acme Corp'`
      );
      expect(acme.rows[0].industry).toBe('Technology');
      expect(acme.rows[0].sector).toBe('SaaS');
      expect(acme.rows[0].description).toBe('Enterprise SaaS');
    });

    it('handles null research_json gracefully', async () => {
      await migrateV1ToV2(client);
      const bigBank = await client.execute(
        `SELECT industry, sector FROM companies WHERE name = 'Big Bank'`
      );
      expect(bigBank.rows[0].industry).toBeNull();
      expect(bigBank.rows[0].sector).toBeNull();
    });
  });

  describe('Step 4: applications migration', () => {
    it('generates TEXT IDs and maps status correctly', async () => {
      await migrateV1ToV2(client);
      const apps = await client.execute(`SELECT id, status, tier FROM applications`);
      expect(apps.rows.length).toBe(3);
      for (const row of apps.rows) {
        expect(typeof row.id).toBe('string');
        expect((row.id as string).length).toBe(16);
        expect(/^[0-9a-f]+$/.test(row.id as string)).toBe(true);
      }
    });

    it('maps V1 status to V2 status enum', async () => {
      await migrateV1ToV2(client);
      const apps = await client.execute(`SELECT status FROM applications ORDER BY applied_at`);
      const statuses = apps.rows.map((r) => r.status);
      expect(statuses).toContain('interviewing');
      expect(statuses).toContain('applied');
      expect(statuses).toContain('rejected');
    });

    it('resolves company_id from company name', async () => {
      await migrateV1ToV2(client);
      const app = await client.execute(
        `SELECT a.company_id, c.name as company_name
         FROM applications a JOIN companies c ON a.company_id = c.id
         WHERE a.role = 'Software Engineer Intern'`
      );
      expect(app.rows.length).toBe(1);
      expect(app.rows[0].company_name).toBe('Acme Corp');
    });

    it('handles applications with no matching company', async () => {
      await migrateV1ToV2(client);
      const app = await client.execute(
        `SELECT company_id FROM applications WHERE role = 'Full Stack Dev'`
      );
      expect(app.rows.length).toBe(1);
      expect(app.rows[0].company_id).toBeNull();
    });

    it('converts epoch timestamps to ISO 8601', async () => {
      await migrateV1ToV2(client);
      const app = await client.execute(
        `SELECT applied_at, created_at FROM applications WHERE role = 'Software Engineer Intern'`
      );
      expect(app.rows.length).toBe(1);
      const appliedAt = app.rows[0].applied_at as string;
      expect(appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(new Date(appliedAt).getFullYear()).toBe(2025);
    });
  });

  describe('Step 8: interview_prep -> interviews', () => {
    it('creates interview records from interview_prep', async () => {
      await migrateV1ToV2(client);
      const interviews = await client.execute(`SELECT * FROM interviews`);
      expect(interviews.rows.length).toBe(1);
      expect(interviews.rows[0].notes).toContain('System design');
      expect(interviews.rows[0].status).toBe('scheduled');
    });

    it('creates prep_packet documents and links them', async () => {
      await migrateV1ToV2(client);
      const interview = await client.execute(
        `SELECT i.prep_packet_id, d.type, d.content
         FROM interviews i JOIN documents d ON i.prep_packet_id = d.id`
      );
      expect(interview.rows.length).toBe(1);
      expect(interview.rows[0].type).toBe('prep_packet');
      expect(interview.rows[0].content).toContain('Acme Corp Interview Prep');
    });
  });

  describe('Step 9: referential integrity', () => {
    it('passes integrity checks after migration', async () => {
      const result = await migrateV1ToV2(client);
      const integrityStep = result.steps.find((s) => s.name === 'verify_integrity');
      expect(integrityStep).toBeDefined();
      expect(integrityStep!.success).toBe(true);
    });
  });

  describe('Step 11: old tables renamed', () => {
    it('renames all V1 tables with _v1_ prefix', async () => {
      await migrateV1ToV2(client);
      const tables = await client.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '_v1_%' ORDER BY name`
      );
      const tableNames = tables.rows.map((r) => r.name as string);
      expect(tableNames).toContain('_v1_applications');
      expect(tableNames).toContain('_v1_contacts');
      expect(tableNames).toContain('_v1_company_research');
      expect(tableNames).toContain('_v1_follow_ups');
      expect(tableNames).toContain('_v1_cover_letters');
      expect(tableNames).toContain('_v1_interview_prep');
    });

    it('does not drop V1 data -- rollback safety', async () => {
      await migrateV1ToV2(client);
      const oldApps = await client.execute(`SELECT * FROM _v1_applications`);
      expect(oldApps.rows.length).toBe(3);
      const oldCompanies = await client.execute(`SELECT * FROM _v1_company_research`);
      expect(oldCompanies.rows.length).toBe(2);
      const oldFollowUps = await client.execute(`SELECT * FROM _v1_follow_ups`);
      expect(oldFollowUps.rows.length).toBe(3);
    });
  });

  describe('Step 10: _migration_id_map dropped', () => {
    it('removes the temporary mapping table', async () => {
      await migrateV1ToV2(client);
      const result = await client.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='_migration_id_map'`
      );
      expect(result.rows.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('Edge cases', () => {
    it('handles empty V1 tables gracefully', async () => {
      const emptyClient = createClient({ url: ':memory:' });
      for (const ddl of V1_DDL) {
        await emptyClient.execute(ddl);
      }
      const result = await migrateV1ToV2(emptyClient);
      expect(result.success).toBe(true);
      for (const step of result.steps) {
        expect(step.success).toBe(true);
      }
    });

    it('generates unique IDs across all tables', async () => {
      await migrateV1ToV2(client);
      const tables = ['companies', 'applications', 'contacts', 'documents',
                       'interviews', 'outreach_queue', 'notifications'];
      const allIds: string[] = [];
      for (const table of tables) {
        const result = await client.execute(`SELECT id FROM ${table}`);
        for (const row of result.rows) {
          allIds.push(row.id as string);
        }
      }
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });
});
