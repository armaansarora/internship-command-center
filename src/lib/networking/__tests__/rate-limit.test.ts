import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * R11.7 — 20 queries/hour/user rate limit.
 *
 * Verifies the typed wrapper over the `bump_match_rate_limit` RPC
 * (migration 0022). Four axes:
 *   - Correct shape at boundaries (count=1, count=20, count=21).
 *   - Fail-closed on every failure mode (rpc error object, rpc throw,
 *     bad row shape, empty array).
 *   - `retryAfterSeconds` is bounded to the next hour boundary (≤ 3600).
 *   - The hour bucket is floored to HH:00:00.000Z before hitting the RPC.
 */

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

describe("checkAndBumpRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:15:30Z")); // 15m 30s into hour → 2670s to boundary
    mockRpc.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ok: true with remaining=19 on first call (count=1)", async () => {
    mockRpc.mockResolvedValue({ data: [{ allowed: true, count: 1 }], error: null });
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    const res = await checkAndBumpRateLimit("u-1");
    expect(res).toEqual({ ok: true, remaining: 19 });
  });

  it("returns ok: true with remaining=0 at count=20 (still allowed)", async () => {
    mockRpc.mockResolvedValue({ data: [{ allowed: true, count: 20 }], error: null });
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    const res = await checkAndBumpRateLimit("u-1");
    expect(res).toEqual({ ok: true, remaining: 0 });
  });

  it("returns blocked at count=21 (over the limit)", async () => {
    mockRpc.mockResolvedValue({ data: [{ allowed: false, count: 21 }], error: null });
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    const res = await checkAndBumpRateLimit("u-1");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      // 3600 - (15*60 + 30) = 3600 - 930 = 2670
      expect(res.retryAfterSeconds).toBe(2670);
    }
  });

  it("fails closed on RPC error object (not thrown)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc broken" } });
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    const res = await checkAndBumpRateLimit("u-1");
    expect(res.ok).toBe(false);
  });

  it("fails closed on RPC throw", async () => {
    mockRpc.mockRejectedValue(new Error("network"));
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    const res = await checkAndBumpRateLimit("u-1");
    expect(res.ok).toBe(false);
  });

  it("fails closed on unexpected RPC shape", async () => {
    mockRpc.mockResolvedValue({ data: [{ wrong: "shape" }], error: null });
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    const res = await checkAndBumpRateLimit("u-1");
    expect(res.ok).toBe(false);
  });

  it("fails closed on empty data array", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    const res = await checkAndBumpRateLimit("u-1");
    expect(res.ok).toBe(false);
  });

  it("passes the hour-bucket to the RPC truncated to the hour", async () => {
    mockRpc.mockResolvedValue({ data: [{ allowed: true, count: 1 }], error: null });
    const { checkAndBumpRateLimit } = await import("../rate-limit");
    await checkAndBumpRateLimit("u-1");
    expect(mockRpc).toHaveBeenCalledWith("bump_match_rate_limit", {
      p_user_id: "u-1",
      p_bucket: "2026-04-24T12:00:00.000Z", // not 12:15
      p_limit: 20,
    });
  });
});
