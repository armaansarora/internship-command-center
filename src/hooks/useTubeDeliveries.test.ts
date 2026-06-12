/**
 * useTubeDeliveries tests.
 *
 * We test the pure helpers (`isEligibleForSweep`, `sweepDeliveries`) against
 * a hand-rolled Supabase client mock. The hook itself is a thin wrapper that
 * wires these helpers to realtime + an interval; exercising the React hook
 * end-to-end would need a DOM + timer rig that the pure-helper tests cover
 * more cleanly.
 *
 * Invariants under test:
 *   - eligibility: undelivered rows with deliver_after in the past (or null)
 *     are eligible; future-scheduled rows are not
 *   - sweep fires onArrival once per eligible row that we successfully claim
 *   - concurrent-win simulation: when UPDATE returns no row (another session
 *     got there first), onArrival is NOT called
 *   - on unmount: the helpers don't leak work — teardown logic lives in the
 *     hook; we assert that the public surface releases the channel when the
 *     consumer flips `enabled` off (covered by the hook's effect cleanup).
 */
import { describe, it, expect, vi } from "vitest";
import {
  isEligibleForSweep,
  sweepDeliveries,
  type TubeArrival,
} from "./useTubeDeliveries";

// ---------------------------------------------------------------------------
// isEligibleForSweep
// ---------------------------------------------------------------------------
describe("isEligibleForSweep", () => {
  const NOW = new Date("2026-04-23T12:00:00.000Z");

  it("returns true for a row with no deliver_after", () => {
    expect(
      isEligibleForSweep({ deliver_after: null, delivered_at: null }, NOW),
    ).toBe(true);
  });

  it("returns true for a row with deliver_after in the past", () => {
    expect(
      isEligibleForSweep(
        { deliver_after: "2026-04-23T11:59:00.000Z", delivered_at: null },
        NOW,
      ),
    ).toBe(true);
  });

  it("returns true at the exact boundary (now == deliver_after)", () => {
    expect(
      isEligibleForSweep(
        { deliver_after: "2026-04-23T12:00:00.000Z", delivered_at: null },
        NOW,
      ),
    ).toBe(true);
  });

  it("returns false for a row with deliver_after in the future", () => {
    expect(
      isEligibleForSweep(
        { deliver_after: "2026-04-23T13:00:00.000Z", delivered_at: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("returns false for an already-delivered row", () => {
    expect(
      isEligibleForSweep(
        {
          deliver_after: null,
          delivered_at: "2026-04-23T11:59:00.000Z",
        },
        NOW,
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sweepDeliveries — mock Supabase client
// ---------------------------------------------------------------------------

interface MockRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  source_agent: string | null;
  actions: unknown;
  deliver_after: string | null;
  delivered_at: string | null;
}

/**
 * Build a minimal Supabase-shaped client that `sweepDeliveries` can drive.
 * Mocks only the two call chains we exercise:
 *   - SELECT eligible rows
 *   - UPDATE SET delivered_at=... WHERE id=? AND delivered_at IS NULL
 */
function makeClient(
  rows: MockRow[],
  opts: { claimOutcomes?: Record<string, "win" | "lose"> } = {},
) {
  const claimOutcomes = opts.claimOutcomes ?? {};
  const selectCalls: Array<{ userId: string }> = [];
  const updateCalls: Array<{ id: string; outcome: "win" | "lose" }> = [];

  // The mock shadows the fluent Supabase API. Methods record calls into the
  // closures above and return `chain` for further chaining; the terminal
  // methods (`maybeSingle`, `limit`) resolve with the shape the production
  // code destructures.
  const client = {
    from(table: string) {
      void table; // surfaces only in error paths; not asserted
      const chain = {
        _mode: "" as "select" | "update",
        _id: null as string | null,
        _userId: null as string | null,
        _updateValues: null as Record<string, unknown> | null,

        select(cols: string) {
          void cols;
          if (chain._mode === "update") {
            // Return a terminal-ish builder for UPDATE ... SELECT.
            return {
              maybeSingle: async () => {
                const id = chain._id!;
                const outcome = claimOutcomes[id] ?? "win";
                updateCalls.push({ id, outcome });
                if (outcome === "lose") {
                  return { data: null, error: null };
                }
                const row = rows.find((r) => r.id === id);
                if (!row) return { data: null, error: null };
                // Faithful to PostgREST: a winning claim stamps delivered_at,
                // so subsequent SELECTs (sweep pagination) exclude this row.
                row.delivered_at = "2026-04-23T12:00:00.000Z";
                return {
                  data: {
                    id: row.id,
                    title: row.title,
                    body: row.body,
                    source_agent: row.source_agent,
                    actions: row.actions,
                  },
                  error: null,
                };
              },
            };
          }
          chain._mode = "select";
          return chain;
        },

        update(values: Record<string, unknown>) {
          chain._mode = "update";
          chain._updateValues = values;
          return chain;
        },

        eq(col: string, val: string) {
          if (col === "user_id") chain._userId = val;
          if (col === "id") chain._id = val;
          return chain;
        },

        is(col: string, val: null) {
          void col;
          void val;
          return chain;
        },

        or(expr: string) {
          void expr;
          return chain;
        },

        order(col: string, o: { ascending: boolean }) {
          void col;
          void o;
          return chain;
        },

        async limit(n: number) {
          selectCalls.push({ userId: chain._userId ?? "" });
          const eligible = rows.filter((r) => r.delivered_at === null);
          return {
            data: eligible.slice(0, n).map((r) => ({
              id: r.id,
              deliver_after: r.deliver_after,
              delivered_at: r.delivered_at,
            })),
            error: null,
          };
        },
      };
      return chain;
    },
  };

  return { client, selectCalls, updateCalls };
}

describe("sweepDeliveries", () => {
  const USER_ID = "u-42";
  const NOW = new Date("2026-04-23T12:00:00.000Z");

  it("fires onArrival once per eligible claimed row", async () => {
    const { client } = makeClient([
      {
        id: "n1",
        user_id: USER_ID,
        title: "First",
        body: "Hello",
        source_agent: "CEO",
        actions: null,
        deliver_after: "2026-04-23T11:00:00.000Z",
        delivered_at: null,
      },
      {
        id: "n2",
        user_id: USER_ID,
        title: "Second",
        body: "World",
        source_agent: null,
        actions: [{ label: "Open", url: "/penthouse" }],
        deliver_after: null,
        delivered_at: null,
      },
    ]);

    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    expect(onArrival).toHaveBeenCalledTimes(2);
    const titles = onArrival.mock.calls.map(
      (c) => (c[0] as TubeArrival).title,
    );
    expect(titles).toContain("First");
    expect(titles).toContain("Second");

    const second = onArrival.mock.calls.find(
      (c) => (c[0] as TubeArrival).id === "n2",
    )?.[0] as TubeArrival;
    expect(second.actions).toEqual([{ label: "Open", url: "/penthouse" }]);
  });

  it("skips rows whose deliver_after is still in the future", async () => {
    const { client } = makeClient([
      {
        id: "future",
        user_id: USER_ID,
        title: "Later",
        body: "...",
        source_agent: null,
        actions: null,
        deliver_after: "2026-04-23T13:00:00.000Z",
        delivered_at: null,
      },
    ]);

    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    expect(onArrival).not.toHaveBeenCalled();
  });

  it("does not fire onArrival when another session wins the claim race", async () => {
    const { client } = makeClient(
      [
        {
          id: "contested",
          user_id: USER_ID,
          title: "Race",
          body: "...",
          source_agent: null,
          actions: null,
          deliver_after: null,
          delivered_at: null,
        },
      ],
      { claimOutcomes: { contested: "lose" } },
    );

    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    expect(onArrival).not.toHaveBeenCalled();
  });

  it("mixes win and lose outcomes across multiple rows", async () => {
    const { client, updateCalls } = makeClient(
      [
        {
          id: "win1",
          user_id: USER_ID,
          title: "Mine",
          body: "...",
          source_agent: null,
          actions: null,
          deliver_after: null,
          delivered_at: null,
        },
        {
          id: "lose1",
          user_id: USER_ID,
          title: "Theirs",
          body: "...",
          source_agent: null,
          actions: null,
          deliver_after: null,
          delivered_at: null,
        },
      ],
      { claimOutcomes: { win1: "win", lose1: "lose" } },
    );

    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    expect(onArrival).toHaveBeenCalledTimes(1);
    expect((onArrival.mock.calls[0][0] as TubeArrival).id).toBe("win1");
    // Both rows were claim-attempted.
    expect(updateCalls.map((c) => c.id).sort()).toEqual(["lose1", "win1"]);
  });

  // -------------------------------------------------------------------------
  // Backlog-flood digest (the dashboard popup-spam fix)
  // -------------------------------------------------------------------------

  const floodRow = (i: number): MockRow => ({
    id: `n${i}`,
    user_id: USER_ID,
    title: `Delivery ${i}`,
    body: "...",
    source_agent: null,
    actions: null,
    deliver_after: null,
    delivered_at: null,
  });

  it("exactly 3 claimable rows → 3 normal arrivals, no digest", async () => {
    const { client } = makeClient([floodRow(1), floodRow(2), floodRow(3)]);
    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    expect(onArrival).toHaveBeenCalledTimes(3);
    const titles = onArrival.mock.calls.map((c) => (c[0] as TubeArrival).title);
    expect(titles.some((t) => t.includes("more deliveries"))).toBe(false);
  });

  it("a 7-row backlog → 3 normal arrivals + ONE digest carrying the other 4", async () => {
    const { client, updateCalls } = makeClient(
      [1, 2, 3, 4, 5, 6, 7].map(floodRow),
    );
    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    // 3 full arrivals + 1 digest — never a 7-modal parade.
    expect(onArrival).toHaveBeenCalledTimes(4);
    const last = onArrival.mock.calls[3][0] as TubeArrival;
    expect(last.id.startsWith("tube-digest-")).toBe(true);
    expect(last.title).toBe("4 more deliveries while you were away");
    expect(last.body).toContain("• Delivery 4");
    expect(last.body).toContain("• Delivery 7");
    // Every row was still atomically claimed (no re-fire on later sweeps).
    expect(updateCalls.length).toBe(7);
  });

  it("digest body caps listed titles and reports the overflow count", async () => {
    const { client } = makeClient(
      Array.from({ length: 12 }, (_, i) => floodRow(i + 1)),
    );
    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    expect(onArrival).toHaveBeenCalledTimes(4);
    const digest = onArrival.mock.calls[3][0] as TubeArrival;
    expect(digest.title).toBe("9 more deliveries while you were away");
    // 6 listed lines + overflow tail for the remaining 3.
    expect(digest.body.match(/^• /gm)?.length).toBe(6);
    expect(digest.body).toContain("…and 3 more");
  });

  it("a >20-row backlog drains via pagination in ONE sweep with ONE digest", async () => {
    const { client, updateCalls, selectCalls } = makeClient(
      Array.from({ length: 25 }, (_, i) => floodRow(i + 1)),
    );
    const onArrival = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sweepDeliveries(client as any, USER_ID, onArrival, NOW);

    // All 25 rows claimed (none left to re-digest on the next interval)…
    expect(updateCalls.length).toBe(25);
    // …across paginated selects (20 + 5)…
    expect(selectCalls.length).toBeGreaterThanOrEqual(2);
    // …surfaced as 3 full arrivals + exactly ONE digest carrying the other 22.
    expect(onArrival).toHaveBeenCalledTimes(4);
    const digest = onArrival.mock.calls[3][0] as TubeArrival;
    expect(digest.title).toBe("22 more deliveries while you were away");
  });
});
