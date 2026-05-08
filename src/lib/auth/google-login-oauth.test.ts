import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";

const { requireEnvSpy } = vi.hoisted(() => ({
  requireEnvSpy: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  requireEnv: requireEnvSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: vi.fn(),
  },
}));

const { getGoogleLoginAuthUrl, hashGoogleLoginNonce } = await import(
  "./google-login-oauth"
);

describe("getGoogleLoginAuthUrl", () => {
  it("sends Google the hashed nonce while retaining our signed state", () => {
    requireEnvSpy.mockReturnValue({
      GOOGLE_CLIENT_ID: "google-client-id",
      GMAIL_REDIRECT_URI: "https://www.interntower.com/api/gmail/callback",
    });

    const authUrl = getGoogleLoginAuthUrl({
      nonce: "raw-nonce",
      state: "login_state",
    });
    const url = new URL(authUrl);

    expect(url.host).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://www.interntower.com/api/gmail/callback",
    );
    expect(url.searchParams.get("state")).toBe("login_state");
    expect(url.searchParams.get("nonce")).toBe(
      createHash("sha256").update("raw-nonce").digest("hex"),
    );
  });
});

describe("hashGoogleLoginNonce", () => {
  it("returns a SHA-256 hex nonce for Supabase Google ID-token login", () => {
    expect(hashGoogleLoginNonce("raw-nonce")).toBe(
      "2c5d107938053a2275f022c153c9a71f65ee07754b8bca543ee97a0c3cc66990",
    );
  });
});
