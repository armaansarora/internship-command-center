/**
 * `consumeAiQuota` — integration tests covering both checks.
 *
 * The function runs two checks in sequence:
 *
 *  1. Global SpendBrake — fails CLOSED. Must short-circuit before the
 *     per-user RPC so we don't burn a quota slot on a denied call.
 *  2. Per-user atomic cap RPC — fails OPEN on infra error.
 *
 * We mock the SpendBrake helper directly (its own unit tests in
 * `spend-brake.test.ts` cover its internals) and the Supabase admin client
 * so the per-user RPC can be steered through every code path.
 */
import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";

const {
  rpcSpy,
  checkGlobalSpendBrakeSpy,
} = vi.hoisted(() => ({
  rpcSpy: vi.fn(),
  checkGlobalSpendBrakeSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    rpc: rpcSpy,
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/ai/spend-brake", () => ({
  checkGlobalSpendBrake: checkGlobalSpendBrakeSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { consumeAiQuota } from "@/lib/ai/quota";
import { _resetEnvCacheForTests } from "@/lib/env";

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
  setEnv({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    KILL_AI_SPEND_USD: "50",
  });
  // Brake allows by default; individual tests can override.
  checkGlobalSpendBrakeSpy.mockResolvedValue({ allowed: true, capCents: 5000 });
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

describe("consumeAiQuota — per-user RPC (when brake is fine)", () => {
  it("returns allowed when the RPC reports usage under the cap", async () => {
    rpcSpy.mockResolvedValue({ data: 3, error: null });

    const result = await consumeAiQuota(USER_A, "free");

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(3);
    expect(result.cap).toBeGreaterThan(0);
    expect(checkGlobalSpendBrakeSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
  });

  it("returns allowed=false with reason=exceeded when RPC raises the over-cap exception", async () => {
    rpcSpy.mockResolvedValue({
      data: null,
      error: { message: "ai_quota_exceeded", code: "P0001" },
    });

    const result = await consumeAiQuota(USER_A, "free");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("exceeded");
  });

  it("FAILS OPEN when the per-user RPC throws an infra error", async () => {
    rpcSpy.mockResolvedValue({
      data: null,
      error: { message: "connection refused", code: "08001" },
    });

    const result = await consumeAiQuota(USER_A, "free");

    expect(result.allowed).toBe(true); // fail-open: don't lock everyone out
    expect(result.reason).toBe("rpc_error");
  });

  it("FAILS OPEN when the rpc call throws synchronously", async () => {
    rpcSpy.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const result = await consumeAiQuota(USER_A, "free");

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("rpc_error");
  });
});

describe("consumeAiQuota — global SpendBrake", () => {
  it("denies with reason=global_spend_cap when the brake has fired", async () => {
    checkGlobalSpendBrakeSpy.mockResolvedValue({
      allowed: false,
      reason: "global_spend_cap",
      totalCostCents: 5500,
      capCents: 5000,
    });

    const result = await consumeAiQuota(USER_A, "free");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("global_spend_cap");
    // Per-user RPC must NOT be touched when the brake has fired — we don't
    // want to burn a quota slot on a denied call.
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("denies with reason=spend_brake_unavailable on brake RPC error (fail-CLOSED)", async () => {
    checkGlobalSpendBrakeSpy.mockResolvedValue({
      allowed: false,
      reason: "spend_brake_unavailable",
      capCents: 5000,
    });

    const result = await consumeAiQuota(USER_A, "free");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("spend_brake_unavailable");
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("per-user check still fires when the global brake is fine", async () => {
    // This is the regression test: a fix that makes the brake fail-CLOSED
    // could accidentally suppress the per-user RPC even when the brake is
    // green. Verify the per-user RPC is still consulted.
    checkGlobalSpendBrakeSpy.mockResolvedValue({ allowed: true, capCents: 5000 });
    rpcSpy.mockResolvedValue({
      data: null,
      error: { message: "ai_quota_exceeded", code: "P0001" },
    });

    const result = await consumeAiQuota(USER_A, "free");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("exceeded");
    expect(rpcSpy).toHaveBeenCalledTimes(1);
  });
});

describe("consumeAiQuota — tier dimension", () => {
  it("uses the free cap for free-tier callers", async () => {
    rpcSpy.mockResolvedValue({ data: 1, error: null });
    const freeResult = await consumeAiQuota(USER_A, "free");
    const freeCap = freeResult.cap;

    rpcSpy.mockResolvedValue({ data: 1, error: null });
    const proResult = await consumeAiQuota(USER_A, "pro");
    const proCap = proResult.cap;

    // Paid tiers should have a strictly higher cap (or equal — never lower).
    expect(proCap).toBeGreaterThanOrEqual(freeCap);
  });
});
