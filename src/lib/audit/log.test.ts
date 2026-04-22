import { describe, it, expect, vi, beforeEach } from "vitest";

const { insertSpy, warnSpy } = vi.hoisted(() => ({
  insertSpy: vi.fn(),
  warnSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ insert: insertSpy }),
  }),
}));

// Mock the logger so audit tests do not rely on env being populated. The
// real logger's `isProd()` gate calls `env()` which throws on missing
// NEXT_PUBLIC_SUPABASE_* in the test sandbox.
vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: warnSpy,
    error: vi.fn(),
  },
}));

import { logSecurityEvent, requestMetadata } from "./log";

describe("logSecurityEvent", () => {
  beforeEach(() => {
    insertSpy.mockReset();
    warnSpy.mockReset();
  });

  it("inserts a row with snake_case columns for the given event", async () => {
    insertSpy.mockResolvedValue({ error: null });
    await logSecurityEvent({
      userId: "user-1",
      eventType: "oauth_connected",
      resourceType: "google",
      metadata: { scopes: ["gmail"] },
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        event_type: "oauth_connected",
        resource_type: "google",
        metadata: { scopes: ["gmail"] },
      }),
    );
  });

  it("never throws if the underlying insert reports an error", async () => {
    insertSpy.mockResolvedValue({ error: { message: "rls denied" } });
    await expect(
      logSecurityEvent({ userId: "user-1", eventType: "data_exported" }),
    ).resolves.toBeUndefined();
  });

  it("never throws if the admin client itself throws", async () => {
    insertSpy.mockRejectedValue(new Error("boom"));
    await expect(
      logSecurityEvent({ userId: "user-1", eventType: "prompt_injection_detected" }),
    ).resolves.toBeUndefined();
  });

  it("never throws even if the logger itself throws", async () => {
    // The logger is mocked in this file; force a throw to confirm the
    // helper's safeWarn wrapper truly swallows logger failures so that
    // no exception ever reaches the caller.
    insertSpy.mockResolvedValue({ error: { message: "rls denied" } });
    warnSpy.mockImplementationOnce(() => { throw new Error("logger exploded"); });
    await expect(
      logSecurityEvent({ userId: "user-1", eventType: "data_exported" }),
    ).resolves.toBeUndefined();
  });

  it("passes through ipAddress and userAgent when provided", async () => {
    insertSpy.mockResolvedValue({ error: null });
    await logSecurityEvent({
      userId: "u", eventType: "login_succeeded",
      ipAddress: "1.2.3.4", userAgent: "agent/1.0",
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ ip_address: "1.2.3.4", user_agent: "agent/1.0" }),
    );
  });
});

describe("requestMetadata", () => {
  it("prefers x-forwarded-for first entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8", "user-agent": "ua/1" } });
    expect(requestMetadata(req)).toEqual({ ipAddress: "1.2.3.4", userAgent: "ua/1" });
  });
  it("falls back to x-real-ip", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(requestMetadata(req)).toEqual({ ipAddress: "9.9.9.9", userAgent: undefined });
  });
  it("returns undefined for both when no headers present", () => {
    const req = new Request("http://x");
    expect(requestMetadata(req)).toEqual({ ipAddress: undefined, userAgent: undefined });
  });
});
