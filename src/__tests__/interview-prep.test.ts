import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

describe('Interview Prep', () => {
  let client: ReturnType<typeof createClient>;
  let testDb: ReturnType<typeof drizzle>;
  let testAppId: number;

  beforeAll(async () => {
    client = createClient({ url: 'file:./data/internship.db' });
    testDb = drizzle(client, { schema });

    // Create a test application to reference
    await testDb.insert(schema.applications).values({
      company: '__TEST_INTERVIEW_PREP_CO__',
      role: 'Test Role',
      tier: 'T1',
      sector: 'Finance',
      status: 'interview',
      appliedAt: new Date(),
    }).run();

    const app = await testDb
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.company, '__TEST_INTERVIEW_PREP_CO__'))
      .get();

    testAppId = app!.id;
  });

  // Clean up interview prep before each test
  beforeEach(async () => {
    if (testAppId) {
      await testDb.delete(schema.interviewPrep)
        .where(eq(schema.interviewPrep.applicationId, testAppId))
        .run();
    }
  });

  afterAll(async () => {
    // Cleanup interview prep records and test app
    if (testAppId) {
      await testDb.delete(schema.interviewPrep)
        .where(eq(schema.interviewPrep.applicationId, testAppId))
        .run();
      await testDb.delete(schema.applications)
        .where(eq(schema.applications.id, testAppId))
        .run();
    }
    client.close();
  });

  it('has the interview_prep table', async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='interview_prep'"
    );
    expect(result.rows).toHaveLength(1);
  });

  it('getInterviewPrep returns null when none exists', async () => {
    const { getInterviewPrep } = await import('@/lib/interview-prep');
    const prep = await getInterviewPrep(testAppId);
    expect(prep).toBeNull();
  });

  it('can insert and retrieve interview prep', async () => {
    const now = new Date();
    await testDb.insert(schema.interviewPrep).values({
      applicationId: testAppId,
      content: '## Company Overview\nTest company overview\n\n## Likely Questions\n1. Tell me about yourself\n\n## Talking Points\n- Point 1\n\n## Recent News\n- News item 1',
      generatedAt: now,
    }).run();

    const { getInterviewPrep } = await import('@/lib/interview-prep');
    const prep = await getInterviewPrep(testAppId);

    expect(prep).not.toBeNull();
    expect(prep!.content).toContain('## Company Overview');
    expect(prep!.applicationId).toBe(testAppId);
  });

  it('getInterviewPrep returns the latest prep when multiple exist', async () => {
    // Insert preps with different generatedAt timestamps
    // Earlier one first
    await testDb.insert(schema.interviewPrep).values({
      applicationId: testAppId,
      content: 'Earlier prep content',
      generatedAt: new Date(Date.now() - 120000),
    }).run();

    // Then a middle one
    await testDb.insert(schema.interviewPrep).values({
      applicationId: testAppId,
      content: 'Middle prep content',
      generatedAt: new Date(Date.now() - 60000),
    }).run();

    // Latest one
    await testDb.insert(schema.interviewPrep).values({
      applicationId: testAppId,
      content: 'Latest prep content',
      generatedAt: new Date(),
    }).run();

    const { getInterviewPrep } = await import('@/lib/interview-prep');
    const prep = await getInterviewPrep(testAppId);

    expect(prep).not.toBeNull();
    expect(prep!.content).toBe('Latest prep content');
  });
});
