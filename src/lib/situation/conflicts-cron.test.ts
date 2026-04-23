import { describe, it, expect, vi } from "vitest";
import { detectConflictsForUser } from "./conflicts-cron";

/**
 * Mock shape for Supabase REST chainable .from().select().eq().gte().lte()
 * etc. The test controls return values per table name.
 */
function stubSupabase(fixtures: {
  interviews?: unknown[];
  calendar_events?: unknown[];
  existingNotifications?: Array<{ source_entity_id: string | null }>;
  onInsert?: (row: Record<string, unknown>) => { error: null | { message: string } };
}): {
  client: Parameters<typeof detectConflictsForUser>[0];
  inserted: Array<Record<string, unknown>>;
} {
  const inserted: Array<Record<string, unknown>> = [];
  const tableData: Record<string, unknown> = {
    interviews: fixtures.interviews ?? [],
    calendar_events: fixtures.calendar_events ?? [],
    notifications: fixtures.existingNotifications ?? [],
  };

  const chainable = (table: string): unknown => {
    const result: { data: unknown; error: null } = {
      data: tableData[table] ?? [],
      error: null,
    };
    const builder: Record<string, unknown> = {};
    const chain = (): unknown => builder;
    builder.select = chain;
    builder.eq = chain;
    builder.gte = chain;
    builder.lte = chain;
    builder.neq = chain;
    builder.then = (cb: (r: typeof result) => unknown) => Promise.resolve(cb(result));
    return builder;
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === "notifications") {
        return {
          ...(chainable(table) as Record<string, unknown>),
          insert: (row: Record<string, unknown>) => {
            inserted.push(row);
            const result = fixtures.onInsert?.(row) ?? { error: null };
            return Promise.resolve(result);
          },
        };
      }
      return chainable(table);
    }),
  };

  return {
    client: client as unknown as Parameters<typeof detectConflictsForUser>[0],
    inserted,
  };
}

describe("detectConflictsForUser (cron integration)", () => {
  it("creates notification for a fresh overlapping pair", async () => {
    const ms = (h: number) => new Date(2026, 3, 23, h, 0, 0).toISOString();
    const { client, inserted } = stubSupabase({
      interviews: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          company_name: "Acme",
          round: "Technical",
          scheduled_at: ms(10),
          duration_minutes: 60,
        },
      ],
      calendar_events: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Dentist",
          start_at: ms(10),
          end_at: ms(11),
        },
      ],
      existingNotifications: [],
    });
    const result = await detectConflictsForUser(
      client,
      "33333333-3333-4333-8333-333333333333",
    );
    expect(result.newPairs).toBe(1);
    expect(result.totalPairs).toBe(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      type: "calendar_conflict",
      priority: "critical",
      user_id: "33333333-3333-4333-8333-333333333333",
    });
    const channels = inserted[0]!.channels as string[];
    expect(channels).toContain("pneumatic_tube");
  });

  it("idempotent: re-run with same existing pair creates zero notifications", async () => {
    const ms = (h: number) => new Date(2026, 3, 23, h, 0, 0).toISOString();
    // Build the pair id the same way the detector does.
    const pairId =
      "calendar_event:22222222-2222-4222-8222-222222222222|interview:11111111-1111-4111-8111-111111111111";
    const { client, inserted } = stubSupabase({
      interviews: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          company_name: "Acme",
          round: "Technical",
          scheduled_at: ms(10),
          duration_minutes: 60,
        },
      ],
      calendar_events: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Dentist",
          start_at: ms(10),
          end_at: ms(11),
        },
      ],
      existingNotifications: [{ source_entity_id: pairId }],
    });
    const result = await detectConflictsForUser(
      client,
      "44444444-4444-4444-8444-444444444444",
    );
    expect(result.newPairs).toBe(0);
    expect(result.totalPairs).toBe(1);
    expect(inserted).toHaveLength(0);
  });

  it("no overlaps → zero inserts, zero errors", async () => {
    const ms = (h: number) => new Date(2026, 3, 23, h, 0, 0).toISOString();
    const { client, inserted } = stubSupabase({
      interviews: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          company_name: "Acme",
          round: "Technical",
          scheduled_at: ms(10),
          duration_minutes: 60,
        },
      ],
      calendar_events: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Dentist",
          start_at: ms(12),
          end_at: ms(13),
        },
      ],
    });
    const result = await detectConflictsForUser(
      client,
      "55555555-5555-4555-8555-555555555555",
    );
    expect(result.totalPairs).toBe(0);
    expect(result.newPairs).toBe(0);
    expect(inserted).toHaveLength(0);
  });
});
