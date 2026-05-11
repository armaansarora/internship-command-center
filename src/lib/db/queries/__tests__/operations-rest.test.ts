/**
 * Unit tests for operations-rest.ts (PR 2 — Activation Funnel Dashboard).
 *
 * Contract: each reader takes an injected SupabaseClient, calls a single
 * predictable PostgREST chain, and aggregates / shapes the response into
 * the dashboard-facing types. No real DB calls — `makeSupabase()` builds
 * a chain stub that records every method call so we can assert on the
 * exact REST verbs used.
 */

import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActivationFunnelCounts,
  getRecentActivationDispatches,
  getActivationCostUsd,
} from "../operations-rest";
import {
  ACTIVATION_BEATS,
  ACTIVATION_OUTCOMES,
} from "@/lib/analytics/activation-metrics";

// ---------------------------------------------------------------------------
// Chain stub builder
// ---------------------------------------------------------------------------

interface TableResult {
  data?: unknown;
  error?: { message: string } | null;
}

/**
 * Build a Supabase chain whose terminal verb (the last call) resolves to
 * `result`. Every intermediate verb (`select`, `eq`, `gte`, `order`,
 * `limit`, `in`) returns the same builder, so any path through the chain
 * works. The terminal verb of every reader in operations-rest is the
 * outermost call that returns the awaited result; in PostgREST it's
 * usually `.order()`, `.limit()`, `.gte()`, or `.in()` depending on the
 * shape. We expose the underlying spies so tests can inspect the args.
 */
function makeSupabase(resultByTable: Record<string, TableResult>): {
  client: SupabaseClient;
  spies: {
    fromSpy: ReturnType<typeof vi.fn>;
    selectSpy: ReturnType<typeof vi.fn>;
    eqSpy: ReturnType<typeof vi.fn>;
    gteSpy: ReturnType<typeof vi.fn>;
    orderSpy: ReturnType<typeof vi.fn>;
    limitSpy: ReturnType<typeof vi.fn>;
    inSpy: ReturnType<typeof vi.fn>;
  };
} {
  let activeResult: TableResult = { data: [], error: null };

  const builder: Record<string, unknown> = {};

  const wrapAsync = <T extends (...args: unknown[]) => unknown>(fn: T) =>
    Object.assign(fn, { then: undefined });
  void wrapAsync;

  const thenable = {
    then: (resolve: (v: TableResult) => void) => resolve(activeResult),
  };

  const selectSpy = vi.fn(() => ({ ...builder, ...thenable }));
  const eqSpy = vi.fn(() => ({ ...builder, ...thenable }));
  const gteSpy = vi.fn(() => ({ ...builder, ...thenable }));
  const orderSpy = vi.fn(() => ({ ...builder, ...thenable }));
  const limitSpy = vi.fn(() => ({ ...builder, ...thenable }));
  const inSpy = vi.fn(() => ({ ...builder, ...thenable }));

  builder.select = selectSpy;
  builder.eq = eqSpy;
  builder.gte = gteSpy;
  builder.order = orderSpy;
  builder.limit = limitSpy;
  builder.in = inSpy;

  const fromSpy = vi.fn((tableName: string) => {
    activeResult = resultByTable[tableName] ?? { data: [], error: null };
    return { ...builder, ...thenable };
  });

  const client = { from: fromSpy } as unknown as SupabaseClient;
  return {
    client,
    spies: { fromSpy, selectSpy, eqSpy, gteSpy, orderSpy, limitSpy, inSpy },
  };
}

// ---------------------------------------------------------------------------
// getActivationFunnelCounts
// ---------------------------------------------------------------------------

describe("getActivationFunnelCounts", () => {
  const sinceIso = "2026-04-01T00:00:00.000Z";

  it("returns zeroed beats + zero totals when no rows match", async () => {
    const { client, spies } = makeSupabase({
      engagement_events: { data: [], error: null },
    });

    const out = await getActivationFunnelCounts(client, { sinceIso });

    expect(spies.fromSpy).toHaveBeenCalledWith("engagement_events");
    expect(spies.selectSpy).toHaveBeenCalledWith(
      "user_id, metadata, created_at",
    );
    expect(spies.eqSpy).toHaveBeenCalledWith("event_type", "activation_step");
    expect(spies.gteSpy).toHaveBeenCalledWith("created_at", sinceIso);

    // Every beat present, every outcome zeroed.
    for (const beat of ACTIVATION_BEATS) {
      for (const outcome of ACTIVATION_OUTCOMES) {
        expect(out.beats[beat][outcome]).toBe(0);
      }
    }
    expect(out.totals).toEqual({
      unique_users: 0,
      started: 0,
      completed: 0,
    });
  });

  it("aggregates rows by (beat, outcome) and computes user-level totals", async () => {
    const { client } = makeSupabase({
      engagement_events: {
        data: [
          // user A: started + completed
          {
            user_id: "user-a",
            metadata: { beat: "lobby_reveal", outcome: "success" },
            created_at: "2026-04-10T00:00:00.000Z",
          },
          {
            user_id: "user-a",
            metadata: { beat: "intake", outcome: "success" },
            created_at: "2026-04-10T00:00:01.000Z",
          },
          {
            user_id: "user-a",
            metadata: { beat: "closing", outcome: "success" },
            created_at: "2026-04-10T00:00:05.000Z",
          },
          // user B: started, abandoned at intake
          {
            user_id: "user-b",
            metadata: { beat: "lobby_reveal", outcome: "success" },
            created_at: "2026-04-10T00:00:00.000Z",
          },
          {
            user_id: "user-b",
            metadata: { beat: "intake", outcome: "abandon" },
            created_at: "2026-04-10T00:00:02.000Z",
          },
          // anonymous row — must still count in beats[] but not in user totals
          {
            user_id: null,
            metadata: { beat: "lobby_reveal", outcome: "success" },
            created_at: "2026-04-10T00:00:00.000Z",
          },
          // malformed row — must be ignored, never throw
          {
            user_id: "user-c",
            metadata: { beat: "lobby_reveal" },
            created_at: "2026-04-10T00:00:00.000Z",
          },
          // unknown beat — must be ignored
          {
            user_id: "user-d",
            metadata: { beat: "nope", outcome: "success" },
            created_at: "2026-04-10T00:00:00.000Z",
          },
        ],
        error: null,
      },
    });

    const out = await getActivationFunnelCounts(client, { sinceIso });

    expect(out.beats.lobby_reveal.success).toBe(3);
    expect(out.beats.intake.success).toBe(1);
    expect(out.beats.intake.abandon).toBe(1);
    expect(out.beats.closing.success).toBe(1);

    // Totals: 2 distinct users (A, B; null doesn't count, malformed not counted)
    expect(out.totals.unique_users).toBe(2);
    expect(out.totals.started).toBe(2); // A and B emitted lobby_reveal
    expect(out.totals.completed).toBe(1); // only A reached closing/success
  });

  it("throws when supabase returns an error", async () => {
    const { client } = makeSupabase({
      engagement_events: { data: null, error: { message: "boom" } },
    });
    await expect(
      getActivationFunnelCounts(client, { sinceIso }),
    ).rejects.toThrow(/boom/);
  });
});

// ---------------------------------------------------------------------------
// getRecentActivationDispatches
// ---------------------------------------------------------------------------

describe("getRecentActivationDispatches", () => {
  it("returns dispatches joined to each user's first application", async () => {
    const { client, spies } = makeSupabase({
      agent_dispatches: {
        data: [
          {
            id: "disp-1",
            user_id: "user-a",
            status: "completed",
            summary: "Find recruiter and ping",
            created_at: "2026-04-10T10:00:00.000Z",
          },
          {
            id: "disp-2",
            user_id: "user-b",
            status: "failed",
            summary: "model timeout",
            created_at: "2026-04-10T09:00:00.000Z",
          },
        ],
        error: null,
      },
      applications: {
        // user-a has two apps; the earlier one wins.
        // user-b has one app.
        data: [
          {
            user_id: "user-a",
            company_name: "Acme",
            role: "SWE Intern",
            applied_at: "2026-04-01T00:00:00.000Z",
          },
          {
            user_id: "user-a",
            company_name: "Globex",
            role: "Backend Intern",
            applied_at: "2026-04-05T00:00:00.000Z",
          },
          {
            user_id: "user-b",
            company_name: "Initech",
            role: "ML Intern",
            applied_at: "2026-04-02T00:00:00.000Z",
          },
        ],
        error: null,
      },
    });

    const out = await getRecentActivationDispatches(client, { limit: 20 });

    expect(spies.fromSpy).toHaveBeenCalledWith("agent_dispatches");
    expect(spies.fromSpy).toHaveBeenCalledWith("applications");
    expect(spies.eqSpy).toHaveBeenCalledWith("task", "activation_first_action");
    expect(spies.orderSpy).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(spies.limitSpy).toHaveBeenCalledWith(20);

    expect(out).toEqual([
      {
        dispatchId: "disp-1",
        userId: "user-a",
        status: "completed",
        summary: "Find recruiter and ping",
        createdAt: "2026-04-10T10:00:00.000Z",
        companyName: "Acme",
        role: "SWE Intern",
      },
      {
        dispatchId: "disp-2",
        userId: "user-b",
        status: "failed",
        summary: "model timeout",
        createdAt: "2026-04-10T09:00:00.000Z",
        companyName: "Initech",
        role: "ML Intern",
      },
    ]);
  });

  it("returns an empty array (and never calls applications) when no dispatches match", async () => {
    const { client, spies } = makeSupabase({
      agent_dispatches: { data: [], error: null },
      applications: { data: [], error: null },
    });

    const out = await getRecentActivationDispatches(client, { limit: 20 });

    expect(out).toEqual([]);
    // applications lookup must be skipped when there are zero user ids to look up
    expect(spies.fromSpy).toHaveBeenCalledTimes(1);
    expect(spies.fromSpy).toHaveBeenCalledWith("agent_dispatches");
  });

  it("yields null company/role when no application context exists for the user", async () => {
    const { client } = makeSupabase({
      agent_dispatches: {
        data: [
          {
            id: "disp-1",
            user_id: "user-orphan",
            status: "completed",
            summary: "ok",
            created_at: "2026-04-10T10:00:00.000Z",
          },
        ],
        error: null,
      },
      applications: { data: [], error: null },
    });

    const out = await getRecentActivationDispatches(client, { limit: 5 });

    expect(out[0]).toEqual({
      dispatchId: "disp-1",
      userId: "user-orphan",
      status: "completed",
      summary: "ok",
      createdAt: "2026-04-10T10:00:00.000Z",
      companyName: null,
      role: null,
    });
  });

  it("throws when supabase returns a dispatches error", async () => {
    const { client } = makeSupabase({
      agent_dispatches: { data: null, error: { message: "no perms" } },
    });
    await expect(
      getRecentActivationDispatches(client, { limit: 5 }),
    ).rejects.toThrow(/no perms/);
  });
});

// ---------------------------------------------------------------------------
// getActivationCostUsd
// ---------------------------------------------------------------------------

describe("getActivationCostUsd", () => {
  const sinceIso = "2026-04-01T00:00:00.000Z";

  it("sums tokens_used and converts via the blended Sonnet 4.6 rate", async () => {
    const { client, spies } = makeSupabase({
      agent_dispatches: {
        data: [
          { tokens_used: 1_000 },
          { tokens_used: 2_500 },
          { tokens_used: 0 },
          { tokens_used: null }, // null must coerce to 0
        ],
        error: null,
      },
    });

    const out = await getActivationCostUsd(client, { sinceIso });

    expect(spies.fromSpy).toHaveBeenCalledWith("agent_dispatches");
    expect(spies.selectSpy).toHaveBeenCalledWith("tokens_used");
    expect(spies.eqSpy).toHaveBeenCalledWith("task", "activation_first_action");
    expect(spies.gteSpy).toHaveBeenCalledWith("created_at", sinceIso);

    expect(out.totalTokens).toBe(3_500);
    expect(out.dispatches).toBe(4);
    // Blended rate = (0.6 * $3 + 0.4 * $15) / 1M = $7.8 / 1M
    // 3,500 tokens * $7.8/M = $0.0273
    expect(out.totalUsd).toBeCloseTo(3_500 * 0.0000078, 10);
  });

  it("returns zero on an empty set", async () => {
    const { client } = makeSupabase({
      agent_dispatches: { data: [], error: null },
    });
    const out = await getActivationCostUsd(client, { sinceIso });
    expect(out).toEqual({ totalTokens: 0, totalUsd: 0, dispatches: 0 });
  });

  it("throws when supabase returns an error", async () => {
    const { client } = makeSupabase({
      agent_dispatches: { data: null, error: { message: "bad query" } },
    });
    await expect(getActivationCostUsd(client, { sinceIso })).rejects.toThrow(
      /bad query/,
    );
  });
});
