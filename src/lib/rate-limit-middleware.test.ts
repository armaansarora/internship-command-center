import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── getClientIp ──────────────────────────────────────────────────────────────

import { getClientIp } from "./rate-limit-middleware";

describe("getClientIp", () => {
  const origEnv = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
  });
  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  });

  it("prefers the first entry of x-forwarded-for", () => {
    const req = new Request("https://example.com/api/x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("https://example.com/api/x", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns a sentinel when no headers are present", () => {
    const req = new Request("https://example.com/api/x");
    expect(getClientIp(req)).toBe("anon:unknown");
  });
});

// ── Tier selection ───────────────────────────────────────────────────────────
//
// We mock the two downstream functions the middleware calls:
//   - getUserTier (Supabase-backed subscription lookup)
//   - checkTieredRateLimit (Upstash-backed limiter)
// and assert that withRateLimit dispatches to the correct bucket per tier.

const { checkTieredSpy, getUserTierSpy } = vi.hoisted(() => ({
  checkTieredSpy: vi.fn(),
  getUserTierSpy: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>(
    "@/lib/rate-limit",
  );
  return {
    ...actual,
    checkTieredRateLimit: checkTieredSpy,
    checkAnonymousRateLimit: vi.fn().mockResolvedValue({
      configured: true,
      success: true,
      remaining: 999,
      reset: 0,
    }),
  };
});

vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: getUserTierSpy,
}));

vi.mock("@/lib/env", () => ({
  isProd: () => false,
  env: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
  }),
  requireEnv: () => ({}),
}));

// Re-import after mocks so the module picks up the mocked dependencies.
const { withRateLimit } = await import("./rate-limit-middleware");

describe("withRateLimit tier selection", () => {
  beforeEach(() => {
    checkTieredSpy.mockReset();
    getUserTierSpy.mockReset();
    // Default: limiter succeeds.
    checkTieredSpy.mockResolvedValue({
      configured: true,
      success: true,
      remaining: 10,
      reset: Date.now() + 60_000,
    });
  });

  it("tier A dispatches to the 60-rpm bucket and skips getUserTier", async () => {
    const result = await withRateLimit("user-a", "A");
    expect(checkTieredSpy).toHaveBeenCalledTimes(1);
    expect(checkTieredSpy).toHaveBeenCalledWith("user-a", "tierA");
    expect(getUserTierSpy).not.toHaveBeenCalled();
    expect(result.response).toBeNull();
    expect(result.headers["X-RateLimit-Limit"]).toBe("60");
  });

  it("tier B (free) dispatches to the 20-rpm bucket", async () => {
    getUserTierSpy.mockResolvedValue("free");
    const result = await withRateLimit("user-b-free", "B");
    expect(getUserTierSpy).toHaveBeenCalledWith("user-b-free");
    expect(checkTieredSpy).toHaveBeenCalledWith("user-b-free", "tierBfree");
    expect(result.headers["X-RateLimit-Limit"]).toBe("20");
    expect(result.response).toBeNull();
  });

  it("tier B (pro) dispatches to the 60-rpm bucket", async () => {
    getUserTierSpy.mockResolvedValue("pro");
    const result = await withRateLimit("user-b-pro", "B");
    expect(checkTieredSpy).toHaveBeenCalledWith("user-b-pro", "tierBpro");
    expect(result.headers["X-RateLimit-Limit"]).toBe("60");
    expect(result.response).toBeNull();
  });

  it("tier B (team) dispatches to the pro bucket as well", async () => {
    // Team users get the same high-tier envelope as pro for agent calls.
    getUserTierSpy.mockResolvedValue("team");
    const result = await withRateLimit("user-b-team", "B");
    expect(checkTieredSpy).toHaveBeenCalledWith("user-b-team", "tierBpro");
    expect(result.headers["X-RateLimit-Limit"]).toBe("60");
  });

  it("tier C dispatches to the 5-rpm bucket and skips getUserTier", async () => {
    const result = await withRateLimit("user-c", "C");
    expect(checkTieredSpy).toHaveBeenCalledWith("user-c", "tierC");
    expect(getUserTierSpy).not.toHaveBeenCalled();
    expect(result.headers["X-RateLimit-Limit"]).toBe("5");
  });

  it("defaults to tier B when no tier arg is provided (backward compat)", async () => {
    getUserTierSpy.mockResolvedValue("free");
    const result = await withRateLimit("user-default");
    expect(checkTieredSpy).toHaveBeenCalledWith("user-default", "tierBfree");
    expect(result.headers["X-RateLimit-Limit"]).toBe("20");
  });

  it("returns a 429 with Retry-After when the limiter reports success=false", async () => {
    const resetAt = Date.now() + 42_000;
    checkTieredSpy.mockResolvedValueOnce({
      configured: true,
      success: false,
      remaining: 0,
      reset: resetAt,
    });
    const result = await withRateLimit("user-limited", "A");
    expect(result.response).not.toBeNull();
    expect(result.response?.status).toBe(429);
    const retryAfter = result.headers["Retry-After"];
    expect(retryAfter).toBeDefined();
    // Retry-After is ceil((reset - now) / 1000) — we allow a small window for test timing jitter.
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number(retryAfter)).toBeLessThanOrEqual(60);
  });
});
