import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';

describe('Seed data', () => {
  it('has at least 71 applications', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      'SELECT COUNT(*) as count FROM applications'
    );
    expect(Number(result.rows[0].count)).toBeGreaterThanOrEqual(71);
    client.close();
  });

  it('has applications in all tiers', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      'SELECT DISTINCT tier FROM applications ORDER BY tier'
    );
    const tierValues = result.rows.map((row) => row.tier);
    expect(tierValues).toContain(1);
    expect(tierValues).toContain(2);
    expect(tierValues).toContain(3);
    expect(tierValues).toContain(4);
    client.close();
  });

  it('has multiple statuses', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      'SELECT DISTINCT status FROM applications'
    );
    expect(result.rows.length).toBeGreaterThanOrEqual(3);
    client.close();
  });

  it('includes applications with interview status', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      "SELECT * FROM applications WHERE status = 'interviewing'"
    );
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    client.close();
  });
});
