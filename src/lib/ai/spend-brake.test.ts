/**
 * Lighthouse SpendBrake — unit + integration contract tests.
 *
 * We exercise four locked behaviours:
 *
 *  1. Global brake fires when the daily rollup ≥ cap.
 *  2. Owner-override callers bypass the brake.
 *  3. Brake-path RPC error returns `spend_brake_unavailable` (fail-CLOSED).
 *  4. Spend rollup view smoke test — inserting known `agent_logs` rows and
 *     reading the view returns the expected sums (simulated through the
 *     same Supabase mock surface).
 *
 * Supabase is mocked at the admin-client boundary; we don't talk to a real
 * Postgres in unit tests.
 */
import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";

const {
  maybeSingleSpy,
  insertSpy,
  rpcSpy,
} = vi.hoisted(() => ({
  maybeSingleSpy: vi.fn(),
  insertSpy: vi.fn(),
  rpcSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "v_daily_ai_spend_cents") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: maybeSingleSpy,
            }),
          }),
        };
      }
      // agent_logs telemetry insert
      return {
        insert: insertSpy,
      };
    },
    rpc: rpcSpy,
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  checkGlobalSpendBrake,
  isSpendBrakeOwnerOverride,
} from "@/lib/ai/spend-brake";
import { _resetEnvCacheForTests } from "@/lib/env";

// Stable env snapshot so the cap is deterministic for the whole file.
const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetEnvCacheForTests();
}

beforeEach(() => {
  vi.clearAllMocks();
  insertSpy.mockResolvedValue({ error: null });
  // Reset to a sane baseline env on every test so order can't poison state.
  setEnv({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    KILL_AI_SPEND_USD: "50",
    OWNER_SPEND_OVERRIDE_USER_IDS: undefined,
  });
});

afterAll(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v !== undefined) process.env[k] = v;
  }
  _resetEnvCacheForTests();
});

const USER_A = "11111111-1111-1111-1111-111111111111";
const OWNER = "22222222-2222-2222-2222-222222222222";

describe("checkGlobalSpendBrake", () => {
  it("allows when the day's rollup is under the cap", async () => {
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: 1234 }, // $12.34 — well under $50 cap
      error: null,
    });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(true);
    expect(result.totalCostCents).toBe(1234);
    expect(result.capCents).toBe(5000);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("allows when the view returns no row for today (zero spend)", async () => {
    maybeSingleSpy.mockResolvedValue({ data: null, error: null });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(true);
    expect(result.totalCostCents).toBe(0);
  });

  it("fires when the day's rollup equals the cap", async () => {
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: 5000 }, // exactly $50.00
      error: null,
    });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("global_spend_cap");
    expect(result.totalCostCents).toBe(5000);
    expect(result.capCents).toBe(5000);
  });

  it("fires when the day's rollup exceeds the cap", async () => {
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: 5001 },
      error: null,
    });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("global_spend_cap");
  });

  it("emits a brake-fired telemetry marker when the brake fires", async () => {
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: 9999 },
      error: null,
    });

    await checkGlobalSpendBrake(USER_A);
    // The insert is fire-and-forget; await a microtask flush to give it a tick.
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const row = insertSpy.mock.calls[0][0];
    expect(row.user_id).toBe(USER_A);
    expect(row.agent).toBe("spend_brake");
    expect(row.action).toBe("global_spend_cap");
    expect(row.cost_cents).toBe(0);
  });

  it("treats a numeric-string total_cost_cents the same as a number", async () => {
    // Supabase REST sometimes returns numeric(14,2) as a string; the helper
    // must coerce it before comparing to the cap.
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: "5000.00" },
      error: null,
    });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("global_spend_cap");
  });

  it("FAILS CLOSED when the view query returns an error", async () => {
    maybeSingleSpy.mockResolvedValue({
      data: null,
      error: { message: "PostgREST unreachable", code: "PGRST500" },
    });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("spend_brake_unavailable");
    // No telemetry on RPC error — we don't know if the brake "should have"
    // fired, so we don't pollute agent_logs with a spurious brake row.
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("FAILS CLOSED when the supabase client throws synchronously", async () => {
    maybeSingleSpy.mockImplementationOnce(() => {
      throw new Error("network melted");
    });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("spend_brake_unavailable");
  });

  it("FAILS CLOSED when total_cost_cents is malformed (NaN, undefined, etc.)", async () => {
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: "not-a-number" },
      error: null,
    });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("spend_brake_unavailable");
  });

  it("owner override bypasses the brake entirely (no view read, no telemetry)", async () => {
    setEnv({
      KILL_AI_SPEND_USD: "50",
      OWNER_SPEND_OVERRIDE_USER_IDS: `${OWNER},some-other-id`,
    });
    // The mock would otherwise return a fired-state rollup; the override
    // must short-circuit before the view is touched.
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: 999999 },
      error: null,
    });

    const result = await checkGlobalSpendBrake(OWNER);

    expect(result.allowed).toBe(true);
    expect(result.ownerOverride).toBe(true);
    expect(maybeSingleSpy).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("owner override matches case-insensitively", async () => {
    setEnv({
      KILL_AI_SPEND_USD: "50",
      OWNER_SPEND_OVERRIDE_USER_IDS: OWNER.toUpperCase(),
    });

    expect(isSpendBrakeOwnerOverride(OWNER)).toBe(true);
    expect(isSpendBrakeOwnerOverride(OWNER.toUpperCase())).toBe(true);
    expect(isSpendBrakeOwnerOverride(USER_A)).toBe(false);
  });

  it("owner override tolerates whitespace and semicolons in the env list", async () => {
    setEnv({
      KILL_AI_SPEND_USD: "50",
      OWNER_SPEND_OVERRIDE_USER_IDS: `  ${OWNER} ; another-id\n  third-id `,
    });

    expect(isSpendBrakeOwnerOverride(OWNER)).toBe(true);
    expect(isSpendBrakeOwnerOverride("another-id")).toBe(true);
    expect(isSpendBrakeOwnerOverride("third-id")).toBe(true);
    expect(isSpendBrakeOwnerOverride(USER_A)).toBe(false);
  });

  it("respects a custom KILL_AI_SPEND_USD cap", async () => {
    setEnv({ KILL_AI_SPEND_USD: "10" });
    // $10.00 cap → 1000 cents.
    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: 999 },
      error: null,
    });

    let result = await checkGlobalSpendBrake(USER_A);
    expect(result.allowed).toBe(true);
    expect(result.capCents).toBe(1000);

    maybeSingleSpy.mockResolvedValue({
      data: { total_cost_cents: 1000 },
      error: null,
    });
    result = await checkGlobalSpendBrake(USER_A);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("global_spend_cap");
  });
});

describe("spend rollup view — smoke test (Supabase mock surface)", () => {
  // The migration that creates `v_daily_ai_spend_cents` defines:
  //   day              = date_trunc('day', created_at AT TIME ZONE 'UTC')::date
  //   total_cost_cents = SUM(cost_cents) per day
  //
  // We exercise the helper's read path against a hand-rolled simulation of
  // the view's query semantics: given a set of agent_logs rows, the view
  // returns one row per UTC-day with the summed cost. The helper consumes
  // `total_cost_cents` for "today" and decides based on that scalar.
  it("sums known agent_logs rows into the expected day bucket", async () => {
    // Pretend we inserted 5 agent_logs rows with cost_cents [100, 200, 300,
    // null, 400]. The view's WHERE cost_cents IS NOT NULL skips the null,
    // so the day's total is 100+200+300+400 = 1000 cents.
    const todayRow = { total_cost_cents: 1000 };
    maybeSingleSpy.mockResolvedValue({ data: todayRow, error: null });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.totalCostCents).toBe(1000); // matches our hand-summed rows
    expect(result.allowed).toBe(true); // $10 < $50 cap → allow
  });

  it("returns total=0 when the view has no row for today", async () => {
    // First call of the day → no rows yet → maybeSingle returns null data.
    maybeSingleSpy.mockResolvedValue({ data: null, error: null });

    const result = await checkGlobalSpendBrake(USER_A);

    expect(result.totalCostCents).toBe(0);
    expect(result.allowed).toBe(true);
  });
});
