/**
 * Data Migration Script: Local SQLite -> Turso Production
 *
 * Reads all tables from the local SQLite database and inserts them
 * into the Turso production database, respecting FK ordering.
 *
 * Usage:
 *   TURSO_PROD_URL=libsql://... TURSO_PROD_TOKEN=... npm run migrate:turso
 *   TURSO_PROD_URL=libsql://... TURSO_PROD_TOKEN=... npm run migrate:turso -- --force
 *
 * Environment:
 *   TURSO_PROD_URL   - Turso production database URL (libsql://...)
 *   TURSO_PROD_TOKEN - Turso production auth token
 *
 * Flags:
 *   --force  - Overwrite existing data in production (skip idempotency check)
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { count } from 'drizzle-orm';
import { isNull, isNotNull } from 'drizzle-orm';
import {
  applications,
  companyResearch,
  followUps,
  contacts,
  coverLetters,
  interviewPrep,
} from '../src/db/schema';

const BATCH_SIZE = 50;
const FORCE = process.argv.includes('--force');

async function main() {
  // Validate environment
  const prodUrl = process.env.TURSO_PROD_URL;
  const prodToken = process.env.TURSO_PROD_TOKEN;

  if (!prodUrl || !prodToken) {
    console.error(
      'ERROR: Missing environment variables.\n' +
        '  TURSO_PROD_URL  - Turso production database URL\n' +
        '  TURSO_PROD_TOKEN - Turso production auth token\n\n' +
        'Usage:\n' +
        '  TURSO_PROD_URL=libsql://... TURSO_PROD_TOKEN=... npm run migrate:turso'
    );
    process.exit(1);
  }

  // Create database connections
  const localClient = createClient({ url: 'file:./data/internship.db' });
  const localDb = drizzle(localClient);

  const prodClient = createClient({ url: prodUrl, authToken: prodToken });
  const prodDb = drizzle(prodClient);

  console.log('Connected to local SQLite and Turso production.\n');

  // Idempotency check
  if (!FORCE) {
    const [result] = await prodDb.select({ value: count() }).from(applications);
    if (result && result.value > 0) {
      console.error(
        `ERROR: Production database already has ${result.value} applications.\n` +
          'Use --force flag to overwrite existing data.\n\n' +
          '  npm run migrate:turso -- --force'
      );
      process.exit(1);
    }
  }

  // Helper: batch insert rows
  async function batchInsert<T extends Record<string, unknown>>(
    db: typeof prodDb,
    table: Parameters<typeof db.insert>[0],
    rows: T[],
    tableName: string
  ) {
    if (rows.length === 0) {
      console.log(`  ${tableName}: 0 rows (skipped)`);
      return;
    }

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db.insert(table).values(batch as never);
    }

    console.log(`  ${tableName}: ${rows.length} rows migrated`);
  }

  console.log('Starting migration in FK dependency order...\n');

  // 1. applications (no FK dependencies)
  const allApplications = await localDb.select().from(applications);
  await batchInsert(prodDb, applications, allApplications, 'applications');

  // 2. companyResearch (no FK dependencies)
  const allResearch = await localDb.select().from(companyResearch);
  await batchInsert(prodDb, companyResearch, allResearch, 'company_research');

  // 3. followUps (references applications.id)
  const allFollowUps = await localDb.select().from(followUps);
  await batchInsert(prodDb, followUps, allFollowUps, 'follow_ups');

  // 4. contacts (self-referential FK: introducedBy)
  //    Insert contacts with no introducedBy first, then those with references
  const contactsNoRef = await localDb
    .select()
    .from(contacts)
    .where(isNull(contacts.introducedBy));
  const contactsWithRef = await localDb
    .select()
    .from(contacts)
    .where(isNotNull(contacts.introducedBy));

  await batchInsert(prodDb, contacts, contactsNoRef, 'contacts (no referral)');
  await batchInsert(prodDb, contacts, contactsWithRef, 'contacts (with referral)');

  const totalContacts = contactsNoRef.length + contactsWithRef.length;
  console.log(`  contacts total: ${totalContacts} rows`);

  // 5. coverLetters (references applications.id)
  const allCoverLetters = await localDb.select().from(coverLetters);
  await batchInsert(prodDb, coverLetters, allCoverLetters, 'cover_letters');

  // 6. interviewPrep (references applications.id)
  const allInterviewPrep = await localDb.select().from(interviewPrep);
  await batchInsert(prodDb, interviewPrep, allInterviewPrep, 'interview_prep');

  console.log('\nMigration complete!');
  console.log(
    `Total: ${allApplications.length} applications, ${allResearch.length} research, ` +
      `${allFollowUps.length} follow-ups, ${totalContacts} contacts, ` +
      `${allCoverLetters.length} cover letters, ${allInterviewPrep.length} interview prep`
  );
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
