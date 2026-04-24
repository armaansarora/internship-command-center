import { describe, it, expect, vi } from "vitest";
import { fireDeadlineBeatsForUser } from "./deadline-cron";

// R10 post-mortem — verifies the cron queries BOTH applications and
// offers, fires deadline beats for offers with the correct source_entity
// surface (entity_type='offer', action url=/parlor), and stamps the
// offers.deadline_alerts_sent jsonb so the same beat doesn't fire twice.

type InsertedRow = Record<string, unknown>;

function stubSupabase(fixtures: {
  applications?: unknown[];
  offers?: unknown[];
  onInsert?: (row: InsertedRow) => { error: null | { message: string } };
}) {
  const inserted: InsertedRow[] = [];
  const updated: Array<{ table: string; payload: Record<string, unknown>; id?: string }> = [];
  const tableData: Record<string, unknown> = {
    applications: fixtures.applications ?? [],
    offers: fixtures.offers ?? [],
  };

  const readBuilder = (table: string) => {
    const result = { data: tableData[table] ?? [], error: null as null | { message: string } };
    const b: Record<string, unknown> = {};
    const chain = () => b;
    b.select = chain;
    b.eq = chain;
    b.gte = chain;
    b.lte = chain;
    b.not = chain;
    b.then = (cb: (r: typeof result) => unknown) => Promise.resolve(cb(result));
    return b;
  };

  const updateBuilder = (table: string, payload: Record<string, unknown>) => {
    let capturedId: string | undefined;
    const b: Record<string, unknown> = {};
    b.eq = (col: string, val: string) => {
      if (col === "id") capturedId = val;
      return b;
    };
    b.then = (cb: (r: { error: null }) => unknown) => {
      updated.push({ table, payload, id: capturedId });
      return Promise.resolve(cb({ error: null }));
    };
    return b;
  };

  const client = {
    from: vi.fn((table: string) => ({
      select: () => readBuilder(table),
      insert: (row: InsertedRow) => {
        inserted.push({ ...row, __table: table });
        const res = fixtures.onInsert?.(row) ?? { error: null };
        return Promise.resolve(res);
      },
      update: (payload: Record<string, unknown>) => updateBuilder(table, payload),
    })),
  };

  return { client, inserted, updated };
}

const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString();

describe("fireDeadlineBeatsForUser — offer deadline beats (R10 post-mortem)", () => {
  it("fires t_24h for an offer with deadline 24h out", async () => {
    const { client, inserted, updated } = stubSupabase({
      offers: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          company_name: "Globex",
          role: "Trader",
          deadline_at: hoursFromNow(24),
          deadline_alerts_sent: {},
        },
      ],
    });

    const res = await fireDeadlineBeatsForUser(
      client as unknown as Parameters<typeof fireDeadlineBeatsForUser>[0],
      "user-1",
    );

    expect(res.beatsFired).toBe(1);
    expect(inserted).toHaveLength(1);
    const notif = inserted[0] as Record<string, unknown>;
    expect(notif.source_entity_type).toBe("offer");
    expect(notif.source_entity_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(notif.type).toBe("deadline_beat");
    expect((notif.title as string).includes("24h")).toBe(true);
    expect(notif.actions).toEqual([{ label: "Open Parlor", url: "/parlor" }]);

    // Offer row must be stamped, not applications
    const offerUpdate = updated.find((u) => u.table === "offers");
    expect(offerUpdate).toBeDefined();
    expect(offerUpdate!.payload.deadline_alerts_sent).toHaveProperty("t_24h");
  });

  it("does not re-fire t_24h when the beat was already stamped", async () => {
    const { client, inserted } = stubSupabase({
      offers: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          company_name: "Initech",
          role: "Analyst",
          deadline_at: hoursFromNow(24),
          deadline_alerts_sent: { t_24h: new Date().toISOString() },
        },
      ],
    });

    const res = await fireDeadlineBeatsForUser(
      client as unknown as Parameters<typeof fireDeadlineBeatsForUser>[0],
      "user-1",
    );

    expect(res.beatsFired).toBe(0);
    expect(inserted).toHaveLength(0);
  });

  it("routes applications to /situation-room and offers to /parlor in the same run", async () => {
    const { client, inserted } = stubSupabase({
      applications: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          company_name: "Acme",
          role: "SWE",
          deadline_at: hoursFromNow(1),
          deadline_alerts_sent: {},
        },
      ],
      offers: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          company_name: "Globex",
          role: "Trader",
          deadline_at: hoursFromNow(1),
          deadline_alerts_sent: {},
        },
      ],
    });

    const res = await fireDeadlineBeatsForUser(
      client as unknown as Parameters<typeof fireDeadlineBeatsForUser>[0],
      "user-1",
    );

    expect(res.beatsFired).toBe(2);
    expect(inserted).toHaveLength(2);
    const appNotif = inserted.find((r) => r.source_entity_type === "application");
    const offerNotif = inserted.find((r) => r.source_entity_type === "offer");
    expect(appNotif).toBeDefined();
    expect(offerNotif).toBeDefined();
    expect(appNotif!.actions).toEqual([
      { label: "Open Situation Room", url: "/situation-room" },
    ]);
    expect(offerNotif!.actions).toEqual([
      { label: "Open Parlor", url: "/parlor" },
    ]);
  });

  it("returns 0 when neither table has near-deadline rows", async () => {
    const { client, inserted } = stubSupabase({ applications: [], offers: [] });
    const res = await fireDeadlineBeatsForUser(
      client as unknown as Parameters<typeof fireDeadlineBeatsForUser>[0],
      "user-empty",
    );
    expect(res.beatsFired).toBe(0);
    expect(inserted).toHaveLength(0);
  });
});
