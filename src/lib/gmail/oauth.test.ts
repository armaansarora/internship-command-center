import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Env mock — fixed 64-char hex master key so encrypt/decrypt are deterministic
// across tests. `requireEnv(["ENCRYPTION_KEY"])` is the only path that the
// module actually touches from `@/lib/env`, so we stub that surface here.
// ---------------------------------------------------------------------------

const TEST_MASTER_HEX = "a".repeat(64); // 32 bytes of 0xaa

vi.mock("@/lib/env", () => ({
  requireEnv: <K extends string>(keys: readonly K[]) => {
    const result: Record<string, string> = {};
    for (const k of keys) {
      if (k === "ENCRYPTION_KEY") result[k] = TEST_MASTER_HEX;
      else result[k] = "test-value";
    }
    return result as { [P in K]: string };
  },
  env: () => ({ NODE_ENV: "test" }),
  isProd: () => false,
}));

// Silence logger to avoid hitting env() deep in the real logger.
vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// The storage helpers touch Supabase. We're not testing storage paths here
// (that would require a full network/db fake), only the encrypt/decrypt
// surface. Stub the supabase modules so the module graph loads cleanly.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/auth/oauth-state", () => ({
  createOAuthState: vi.fn(),
}));

import {
  encrypt,
  decrypt,
  encryptForUser,
  decryptForUser,
} from "./oauth";

describe("encryptForUser / decryptForUser (v2)", () => {
  beforeEach(() => {
    // nothing — mocks are module-level
  });

  it("round-trips plaintext for the same user", () => {
    const user = "00000000-0000-0000-0000-000000000001";
    const plain = JSON.stringify({ access_token: "tok", refresh_token: "rtok", expiry_date: 42 });
    const blob = encryptForUser(user, plain);
    expect(blob.startsWith("v2:")).toBe(true);
    expect(decryptForUser(user, blob)).toBe(plain);
  });

  it("produces the v2 prefix and four colon-separated fields", () => {
    const blob = encryptForUser("u", "hello");
    const parts = blob.split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v2");
    // iv: 12 bytes -> 24 hex chars
    expect(parts[1]).toHaveLength(24);
    // ct and tag are hex, non-empty
    expect(parts[2].length).toBeGreaterThan(0);
    expect(parts[3].length).toBe(32); // 16-byte GCM tag -> 32 hex
  });

  it("is per-user: a blob encrypted for user A cannot be decrypted for user B", () => {
    const blob = encryptForUser("user-a", "secret");
    expect(() => decryptForUser("user-b", blob)).toThrow();
  });

  it("falls back to legacy decrypt when blob has no v2: prefix", () => {
    // Encrypt with the legacy single-master scheme, then decryptForUser
    // must transparently recover it.
    const legacy = encrypt("legacy-plain");
    expect(legacy.startsWith("v2:")).toBe(false);
    expect(decryptForUser("any-user", legacy)).toBe("legacy-plain");
  });

  it("throws on corrupted v2 ciphertext instead of silently falling back to legacy", () => {
    const user = "00000000-0000-0000-0000-000000000001";
    const blob = encryptForUser(user, "x");
    // Flip a byte in the ciphertext portion.
    const parts = blob.split(":");
    const corruptedCt = parts[2].replace(/^./, (c) => (c === "a" ? "b" : "a"));
    const corrupted = [parts[0], parts[1], corruptedCt, parts[3]].join(":");
    expect(() => decryptForUser(user, corrupted)).toThrow();
  });

  it("throws on corrupted legacy ciphertext", () => {
    const legacy = encrypt("plain");
    const parts = legacy.split(":");
    const corruptedCt = parts[1].replace(/^./, (c) => (c === "a" ? "b" : "a"));
    const corrupted = [parts[0], corruptedCt, parts[2]].join(":");
    expect(() => decryptForUser("u", corrupted)).toThrow();
  });

  it("each encryption produces a fresh IV (no deterministic ciphertext)", () => {
    const user = "u1";
    const a = encryptForUser(user, "same");
    const b = encryptForUser(user, "same");
    expect(a).not.toBe(b);
    // Both still decrypt to the same plaintext.
    expect(decryptForUser(user, a)).toBe("same");
    expect(decryptForUser(user, b)).toBe("same");
  });
});

describe("encrypt / decrypt (legacy v1)", () => {
  it("round-trips", () => {
    const plain = "hello, legacy";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });
});
