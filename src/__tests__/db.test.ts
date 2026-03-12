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

  it('has the company_research table', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='company_research'"
    );
    expect(result.rows).toHaveLength(1);
    client.close();
  });

  it('has the follow_ups table', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='follow_ups'"
    );
    expect(result.rows).toHaveLength(1);
    client.close();
  });
});
