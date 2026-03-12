import { describe, it, expect } from 'vitest';
import * as schema from '../../db/schema-v2';

describe('V2 Schema', () => {
  it('exports all 15 tables', () => {
    const tables = [
      'applications',
      'companies',
      'contacts',
      'emails',
      'documents',
      'interviews',
      'calendarEvents',
      'outreachQueue',
      'notifications',
      'userPreferences',
      'agentLogs',
      'agentMemory',
      'dailySnapshots',
      'companyEmbeddings',
      'jobEmbeddings',
    ];
    for (const table of tables) {
      expect(schema).toHaveProperty(table);
    }
  });

  it('exports type helpers for each table', () => {
    // Type-level check — if this compiles, types are exported
    const _app: schema.Application | undefined = undefined;
    const _company: schema.Company | undefined = undefined;
    const _contact: schema.Contact | undefined = undefined;
    const _email: schema.Email | undefined = undefined;
    const _doc: schema.Document | undefined = undefined;
    const _interview: schema.Interview | undefined = undefined;
    const _calEvent: schema.CalendarEvent | undefined = undefined;
    const _outreach: schema.OutreachQueueItem | undefined = undefined;
    const _notif: schema.Notification | undefined = undefined;
    const _prefs: schema.UserPreference | undefined = undefined;
    const _agentLog: schema.AgentLog | undefined = undefined;
    const _agentMem: schema.AgentMemory | undefined = undefined;
    const _snapshot: schema.DailySnapshot | undefined = undefined;
    const _compEmbed: schema.CompanyEmbedding | undefined = undefined;
    const _jobEmbed: schema.JobEmbedding | undefined = undefined;
    expect(true).toBe(true); // If we got here, types exist
  });
});
