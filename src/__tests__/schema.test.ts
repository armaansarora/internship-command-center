import { describe, it, expect } from 'vitest';
import { applications, companyResearch, followUps } from '@/db/schema';

describe('Schema', () => {
  it('applications table has all required columns', () => {
    const cols = Object.keys(applications);
    const required = [
      'id', 'company', 'role', 'tier', 'sector', 'status',
      'appliedAt', 'platform', 'contactName', 'contactEmail',
      'contactRole', 'notes', 'createdAt', 'updatedAt',
    ];
    for (const col of required) {
      expect(cols, `missing column: ${col}`).toContain(col);
    }
  });

  it('companyResearch table has required columns', () => {
    const cols = Object.keys(companyResearch);
    expect(cols).toContain('id');
    expect(cols).toContain('companyName');
    expect(cols).toContain('researchJson');
    expect(cols).toContain('fetchedAt');
  });

  it('followUps table has required columns', () => {
    const cols = Object.keys(followUps);
    expect(cols).toContain('id');
    expect(cols).toContain('applicationId');
    expect(cols).toContain('dueAt');
    expect(cols).toContain('completedAt');
    expect(cols).toContain('note');
    expect(cols).toContain('dismissed');
  });
});
