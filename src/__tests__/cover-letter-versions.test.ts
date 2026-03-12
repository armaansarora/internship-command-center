import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, like } from 'drizzle-orm';
import * as schema from '@/db/schema';

describe('Cover Letter Versions', () => {
  let client: ReturnType<typeof createClient>;
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    client = createClient({ url: 'file:./data/internship.db' });
    testDb = drizzle(client, { schema });
  });

  // Clean up any test data before each test
  beforeEach(async () => {
    const testLetters = await testDb
      .select()
      .from(schema.coverLetters)
      .where(like(schema.coverLetters.company, '__TEST_%'))
      .all();
    for (const l of testLetters) {
      await testDb.delete(schema.coverLetters).where(eq(schema.coverLetters.id, l.id)).run();
    }
  });

  afterAll(async () => {
    // Final cleanup
    const testLetters = await testDb
      .select()
      .from(schema.coverLetters)
      .where(like(schema.coverLetters.company, '__TEST_%'))
      .all();
    for (const l of testLetters) {
      await testDb.delete(schema.coverLetters).where(eq(schema.coverLetters.id, l.id)).run();
    }
    client.close();
  });

  it('has the cover_letters table', async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='cover_letters'"
    );
    expect(result.rows).toHaveLength(1);
  });

  it('can insert and retrieve a cover letter', async () => {
    const now = new Date();
    await testDb.insert(schema.coverLetters).values({
      company: '__TEST_COMPANY__',
      role: 'Test Role',
      content: 'Test cover letter content',
      isActive: false,
      generatedAt: now,
    }).run();

    const letters = await testDb
      .select()
      .from(schema.coverLetters)
      .where(eq(schema.coverLetters.company, '__TEST_COMPANY__'))
      .all();

    expect(letters.length).toBeGreaterThanOrEqual(1);
    expect(letters[0].content).toBe('Test cover letter content');
    expect(letters[0].isActive).toBe(false);
  });

  it('setActiveCoverLetter marks one active and others inactive for same company', async () => {
    const now = new Date();

    // Insert 3 cover letters for the same company
    await testDb.insert(schema.coverLetters).values({
      company: '__TEST_ACTIVE__', role: 'Role A', content: 'Content A', isActive: false, generatedAt: now,
    }).run();
    await testDb.insert(schema.coverLetters).values({
      company: '__TEST_ACTIVE__', role: 'Role B', content: 'Content B', isActive: false, generatedAt: now,
    }).run();
    await testDb.insert(schema.coverLetters).values({
      company: '__TEST_ACTIVE__', role: 'Role C', content: 'Content C', isActive: false, generatedAt: now,
    }).run();

    const letters = await testDb
      .select()
      .from(schema.coverLetters)
      .where(eq(schema.coverLetters.company, '__TEST_ACTIVE__'))
      .all();

    expect(letters).toHaveLength(3);

    // Import and call setActiveCoverLetter
    const { setActiveCoverLetter } = await import('@/lib/cover-letter-versions');

    // Set the second one as active
    await setActiveCoverLetter(letters[1].id);

    const updated = await testDb
      .select()
      .from(schema.coverLetters)
      .where(eq(schema.coverLetters.company, '__TEST_ACTIVE__'))
      .all();

    const activeCount = updated.filter(l => l.isActive).length;
    expect(activeCount).toBe(1);

    const activeOne = updated.find(l => l.isActive);
    expect(activeOne?.id).toBe(letters[1].id);
  });

  it('getAllCoverLettersGrouped returns letters grouped by company', async () => {
    const now = new Date();

    // Insert letters for 2 companies
    await testDb.insert(schema.coverLetters).values({
      company: '__TEST_GROUP_A__', role: 'Role 1', content: 'A1', isActive: false, generatedAt: now,
    }).run();
    await testDb.insert(schema.coverLetters).values({
      company: '__TEST_GROUP_A__', role: 'Role 2', content: 'A2', isActive: false, generatedAt: now,
    }).run();
    await testDb.insert(schema.coverLetters).values({
      company: '__TEST_GROUP_B__', role: 'Role 1', content: 'B1', isActive: false, generatedAt: now,
    }).run();

    const { getAllCoverLettersGrouped } = await import('@/lib/cover-letter-versions');
    const grouped = await getAllCoverLettersGrouped();

    expect(grouped['__TEST_GROUP_A__']).toBeDefined();
    expect(grouped['__TEST_GROUP_A__'].length).toBe(2);
    expect(grouped['__TEST_GROUP_B__']).toBeDefined();
    expect(grouped['__TEST_GROUP_B__'].length).toBe(1);
  });
});
