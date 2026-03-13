import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';

describe('Database', () => {
  it('connects and has the applications table', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='applications'"
    );
    expect(result.rows).toHaveLength(1);
    client.close();
  });

  it('has the company_research table (now companies)', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='companies'"
    );
    expect(result.rows).toHaveLength(1);
    client.close();
  });

  it('has the contacts table', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'"
    );
    expect(result.rows).toHaveLength(1);
    client.close();
  });
});
