import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";

const { requireEnvSpy } = vi.hoisted(() => ({
  requireEnvSpy: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  requireEnv: requireEnvSpy,
}));

const { logWarnSpy } = vi.hoisted(() => ({
  logWarnSpy: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: logWarnSpy,
  },
}));

const {
  GoogleLoginTokenExchangeError,
  exchangeGoogleLoginCodeForIdToken,
  getGoogleLoginAuthUrl,
  getGoogleLoginTokenExchangeLobbyError,
  hashGoogleLoginNonce,
} = await import("./google-login-oauth");

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

describe("exchangeGoogleLoginCodeForIdToken", () => {
  it("logs safe Google OAuth error fields and throws a typed token error", async () => {
    requireEnvSpy.mockReturnValue({
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      GMAIL_REDIRECT_URI: "https://www.interntower.com/api/gmail/callback",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Bad Request: code was already redeemed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      exchangeGoogleLoginCodeForIdToken("single-use-code"),
    ).rejects.toMatchObject({
      name: "GoogleLoginTokenExchangeError",
      status: 400,
      googleError: "invalid_grant",
      googleErrorDescription: "Bad Request: code was already redeemed",
    });

    expect(logWarnSpy).toHaveBeenCalledWith(
      "auth.google_login.token_exchange_failed",
      {
        status: 400,
        googleError: "invalid_grant",
        googleErrorDescription: "Bad Request: code was already redeemed",
      },
    );
    expect(JSON.stringify(logWarnSpy.mock.calls)).not.toContain(
      "single-use-code",
    );
    expect(JSON.stringify(logWarnSpy.mock.calls)).not.toContain(
      "google-client-secret",
    );

    fetchSpy.mockRestore();
  });
});

describe("getGoogleLoginTokenExchangeLobbyError", () => {
  it("maps a replayed or expired Google auth code to restart-required", () => {
    const error = new GoogleLoginTokenExchangeError({
      status: 400,
      googleError: "invalid_grant",
      googleErrorDescription: "Bad Request",
    });

    expect(getGoogleLoginTokenExchangeLobbyError(error)).toBe(
      "auth_restart_required",
    );
  });

  it("maps Google provider outages to auth_unavailable", () => {
    const error = new GoogleLoginTokenExchangeError({
      status: 503,
      googleError: "temporarily_unavailable",
      googleErrorDescription: "Service unavailable",
    });

    expect(getGoogleLoginTokenExchangeLobbyError(error)).toBe(
      "auth_unavailable",
    );
  });
});
