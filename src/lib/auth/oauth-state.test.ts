import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOAuthState, verifyOAuthState } from "./oauth-state";
import { _resetEnvCacheForTests } from "@/lib/env";

const TEST_SECRET = "test-secret-that-is-at-least-32-bytes-long-aaaaa";

describe("oauth-state", () => {
  const originalSecret = process.env.OAUTH_STATE_SECRET;

  beforeEach(() => {
    process.env.OAUTH_STATE_SECRET = TEST_SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    _resetEnvCacheForTests();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.OAUTH_STATE_SECRET;
    } else {
      process.env.OAUTH_STATE_SECRET = originalSecret;
    }
    _resetEnvCacheForTests();
  });

  it("round-trips a state + nonce", () => {
    const { state, nonce } = createOAuthState({ userId: "user-123" });
    const result = verifyOAuthState(state, nonce);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.userId).toBe("user-123");
    }
  });

  it("rejects a tampered signature", () => {
    const { state, nonce } = createOAuthState({ userId: "user-123" });
    const [body, sig] = state.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    const result = verifyOAuthState(`${body}.${flipped}`, nonce);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects a tampered body", () => {
    const { state, nonce } = createOAuthState({ userId: "user-123" });
    const [, sig] = state.split(".");
    const forged = Buffer.from(
      JSON.stringify({ v: 1, userId: "attacker", nonce, issuedAt: Date.now() }),
      "utf8"
    ).toString("base64url");
    const result = verifyOAuthState(`${forged}.${sig}`, nonce);
    expect(result.ok).toBe(false);
  });

  it("rejects a missing/mismatched nonce", () => {
    const { state } = createOAuthState({ userId: "user-123" });
    const result = verifyOAuthState(state, "not-the-real-nonce");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("nonce_mismatch");
  });

  it("rejects malformed states", () => {
    const result = verifyOAuthState("not-even-close", "x");
    expect(result.ok).toBe(false);
  });
});
