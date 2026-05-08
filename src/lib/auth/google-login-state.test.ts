import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGoogleLoginState,
  verifyGoogleLoginState,
} from "./google-login-state";
import { _resetEnvCacheForTests } from "@/lib/env";

describe("google login state", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.useRealTimers();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.OAUTH_STATE_SECRET = "x".repeat(32);
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    _resetEnvCacheForTests();
    vi.useRealTimers();
  });

  it("round-trips a fresh state cookie", () => {
    const created = createGoogleLoginState("/settings");

    const result = verifyGoogleLoginState(created.state, created.cookieValue);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.nonce).toBe(created.nonce);
      expect(result.payload.next).toBe("/settings");
    }
  });

  it("rejects a mismatched returned state", () => {
    const created = createGoogleLoginState("/settings");

    expect(verifyGoogleLoginState("wrong", created.cookieValue)).toEqual({
      ok: false,
      reason: "state_mismatch",
    });
  });

  it("rejects tampered cookies", () => {
    const created = createGoogleLoginState("/settings");

    expect(verifyGoogleLoginState(created.state, `${created.cookieValue}x`)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects expired cookies", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00Z"));
    const created = createGoogleLoginState("/settings");
    vi.setSystemTime(new Date("2026-05-08T00:11:00Z"));

    expect(verifyGoogleLoginState(created.state, created.cookieValue)).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});
