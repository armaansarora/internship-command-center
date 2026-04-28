/**
 * joinWaitlist Server Action — security contract tests (F-6).
 *
 * Locks:
 * - Per-email rate limit (5/min)
 * - IP capture from x-forwarded-for / x-real-ip
 * - Existing validation behavior on bad emails
 *
 * The Server Action lives at `src/app/(marketing)/waitlist/actions.ts`.
 * We mock `next/headers`, `@/lib/supabase/admin`, and `@/lib/rate-limit`
 * because vitest's node environment doesn't provide a request context.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  insertSpy,
  getSupabaseAdminSpy,
  headersSpy,
  checkInMemoryRateLimitSpy,
} = vi.hoisted(() => {
  const insertSpy = vi.fn();
  return {
    insertSpy,
    getSupabaseAdminSpy: vi.fn(() => ({
      from: () => ({ insert: insertSpy }),
    })),
    headersSpy: vi.fn(),
    checkInMemoryRateLimitSpy: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: () => headersSpy(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminSpy,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkInMemoryRateLimit: checkInMemoryRateLimitSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { joinWaitlist } from "./actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

function makeHeaders(map: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(map)) h.set(k, v);
  return h;
}

describe("joinWaitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: limiter allows, headers empty, insert succeeds.
    checkInMemoryRateLimitSpy.mockReturnValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60_000,
    });
    headersSpy.mockResolvedValue(makeHeaders({}));
    insertSpy.mockResolvedValue({ error: null });
  });

  it("returns the validation error on a malformed email", async () => {
    const result = await joinWaitlist(makeFormData({ email: "not-an-email" }));
    expect(result).toEqual({ ok: false, error: "Please enter a valid email." });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rate-limits the same email after 5 calls in a window", async () => {
    // First five calls succeed; the sixth is denied by the limiter.
    checkInMemoryRateLimitSpy
      .mockReturnValueOnce({ success: true, remaining: 4, reset: 0 })
      .mockReturnValueOnce({ success: true, remaining: 3, reset: 0 })
      .mockReturnValueOnce({ success: true, remaining: 2, reset: 0 })
      .mockReturnValueOnce({ success: true, remaining: 1, reset: 0 })
      .mockReturnValueOnce({ success: true, remaining: 0, reset: 0 })
      .mockReturnValueOnce({ success: false, remaining: 0, reset: 0 });

    for (let i = 0; i < 5; i++) {
      const ok = await joinWaitlist(makeFormData({ email: "user@example.com" }));
      expect(ok).toEqual({ ok: true });
    }

    const denied = await joinWaitlist(makeFormData({ email: "user@example.com" }));
    expect(denied).toEqual({
      ok: false,
      error: "Too many requests. Try again in a minute.",
    });

    // Limiter must be keyed on the normalized email, not raw input.
    const keys = checkInMemoryRateLimitSpy.mock.calls.map((c) => c[0]);
    expect(keys.every((k) => k === "waitlist:user@example.com")).toBe(true);
  });

  it("normalizes case before keying the limiter (MIXED@case.COM)", async () => {
    await joinWaitlist(makeFormData({ email: "MIXED@Case.COM" }));
    const firstKey = checkInMemoryRateLimitSpy.mock.calls[0]?.[0];
    expect(firstKey).toBe("waitlist:mixed@case.com");
  });

  it("captures the client ip from x-forwarded-for and stores it on the row", async () => {
    headersSpy.mockResolvedValueOnce(
      makeHeaders({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
    );
    const result = await joinWaitlist(makeFormData({ email: "ip@example.com" }));
    expect(result).toEqual({ ok: true });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const row = insertSpy.mock.calls[0]?.[0];
    expect(row).toMatchObject({
      email: "ip@example.com",
      ip_address: "203.0.113.7",
    });
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", async () => {
    headersSpy.mockResolvedValueOnce(
      makeHeaders({ "x-real-ip": "198.51.100.42" }),
    );
    await joinWaitlist(makeFormData({ email: "real-ip@example.com" }));
    const row = insertSpy.mock.calls[0]?.[0];
    expect(row?.ip_address).toBe("198.51.100.42");
  });

  it("stores ip_address as null when neither header is present", async () => {
    headersSpy.mockResolvedValueOnce(makeHeaders({}));
    await joinWaitlist(makeFormData({ email: "no-ip@example.com" }));
    const row = insertSpy.mock.calls[0]?.[0];
    expect(row?.ip_address).toBeNull();
  });

  it("treats unique-violation (already on list) as a silent success", async () => {
    insertSpy.mockResolvedValueOnce({ error: { code: "23505" } });
    const result = await joinWaitlist(
      makeFormData({ email: "dup@example.com" }),
    );
    expect(result).toEqual({ ok: true });
  });
});
