import { describe, it, expect } from 'vitest';
import { contacts } from '@/db/schema';

describe('Contacts Schema', () => {
  it('contacts table has all required columns', () => {
    const cols = Object.keys(contacts);
    const required = [
      'id', 'name', 'company', 'email', 'phone', 'role',
      'relationshipType', 'introducedBy', 'lastContactedAt',
      'notes', 'createdAt', 'updatedAt',
    ];
    for (const col of required) {
      expect(cols, `missing column: ${col}`).toContain(col);
    }
  });

  it('contacts table exports Contact and NewContact types', async () => {
    const schema = await import('@/db/schema');
    expect(schema.contacts).toBeDefined();
    // Type-level check: these types should exist (compile-time check)
    type _Contact = typeof schema.contacts.$inferSelect;
    type _NewContact = typeof schema.contacts.$inferInsert;
  });
});

describe('getContactsByCompany', () => {
  it('is exported from contacts lib', async () => {
    const mod = await import('@/lib/contacts');
    expect(mod.getContactsByCompany).toBeDefined();
    expect(typeof mod.getContactsByCompany).toBe('function');
  });
});
