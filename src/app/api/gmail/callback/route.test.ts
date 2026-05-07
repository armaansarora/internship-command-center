import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Contract tests for GET /api/gmail/callback.
 *
 * The callback completes the combined Gmail + Calendar OAuth flow. It must
 * validate the signed state, bind it to the current session user, clear the
 * single-use nonce cookie on every path, and only then store Google tokens.
 */

const {
  requireUserSpy,
  exchangeCodeSpy,
  storeGoogleTokensSpy,
  verifyOAuthStateSpy,
  logWarnSpy,
  logErrorSpy,
  logInfoSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  exchangeCodeSpy: vi.fn(),
  storeGoogleTokensSpy: vi.fn(),
  verifyOAuthStateSpy: vi.fn(),
  logWarnSpy: vi.fn(),
  logErrorSpy: vi.fn(),
  logInfoSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  requireUser: requireUserSpy,
}));

vi.mock("@/lib/gmail/oauth", () => ({
  exchangeCodeForTokens: exchangeCodeSpy,
  storeGoogleTokens: storeGoogleTokensSpy,
}));

vi.mock("@/lib/auth/oauth-state", () => ({
  OAUTH_STATE_COOKIE: "oauth_state_nonce",
  verifyOAuthState: verifyOAuthStateSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: logWarnSpy,
    error: logErrorSpy,
    info: logInfoSpy,
    debug: vi.fn(),
  },
}));

const { GET } = await import("./route");

function makeRequest(search: string, nonce = "nonce-cookie"): NextRequest {
  return new NextRequest(`http://localhost/api/gmail/callback${search}`, {
    headers: nonce ? { cookie: `oauth_state_nonce=${nonce}` } : {},
  });
}

function expectClearedStateCookie(res: Response): void {
  const cookie = res.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("oauth_state_nonce=");
  expect(cookie).toContain("Path=/api/gmail");
  expect(cookie).toContain("Max-Age=0");
}

describe("GET /api/gmail/callback", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    exchangeCodeSpy.mockReset();
    storeGoogleTokensSpy.mockReset();
    verifyOAuthStateSpy.mockReset();
    logWarnSpy.mockReset();
    logErrorSpy.mockReset();
    logInfoSpy.mockReset();

    requireUserSpy.mockResolvedValue({
      id: "session-user",
      email: "fresh@example.com",
    });
  });

  it("redirects OAuth denials back to Situation Room and clears the nonce cookie", async () => {
    const res = await GET(makeRequest("?error=access_denied"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/situation-room?error=oauth_denied",
    );
    expectClearedStateCookie(res);
    expect(verifyOAuthStateSpy).not.toHaveBeenCalled();
    expect(exchangeCodeSpy).not.toHaveBeenCalled();
  });

  it("rejects missing code/state before token exchange", async () => {
    const res = await GET(makeRequest("?code=code-only"));

    expect(res.headers.get("location")).toBe(
      "http://localhost/situation-room?error=missing_params",
    );
    expectClearedStateCookie(res);
    expect(exchangeCodeSpy).not.toHaveBeenCalled();
  });

  it("rejects callbacks without the single-use nonce cookie", async () => {
    const res = await GET(makeRequest("?code=abc&state=signed", ""));

    expect(res.headers.get("location")).toBe(
      "http://localhost/situation-room?error=missing_state",
    );
    expectClearedStateCookie(res);
    expect(logWarnSpy).toHaveBeenCalledWith("gmail.oauth.missing_state_cookie", {
      userId: "session-user",
    });
    expect(exchangeCodeSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid state and never exchanges the OAuth code", async () => {
    verifyOAuthStateSpy.mockReturnValue({
      ok: false,
      reason: "bad_signature",
    });

    const res = await GET(makeRequest("?code=abc&state=signed"));

    expect(verifyOAuthStateSpy).toHaveBeenCalledWith("signed", "nonce-cookie");
    expect(res.headers.get("location")).toBe(
      "http://localhost/situation-room?error=invalid_state",
    );
    expectClearedStateCookie(res);
    expect(exchangeCodeSpy).not.toHaveBeenCalled();
  });

  it("rejects a state bound to a different user", async () => {
    verifyOAuthStateSpy.mockReturnValue({
      ok: true,
      payload: { userId: "other-user" },
    });

    const res = await GET(makeRequest("?code=abc&state=signed"));

    expect(res.headers.get("location")).toBe(
      "http://localhost/situation-room?error=state_user_mismatch",
    );
    expectClearedStateCookie(res);
    expect(logErrorSpy).toHaveBeenCalledWith(
      "gmail.oauth.user_mismatch",
      undefined,
      {
        sessionUserId: "session-user",
        stateUserId: "other-user",
      },
    );
    expect(exchangeCodeSpy).not.toHaveBeenCalled();
    expect(storeGoogleTokensSpy).not.toHaveBeenCalled();
  });

  it("stores exchanged tokens with the admin path and redirects to connected state", async () => {
    verifyOAuthStateSpy.mockReturnValue({
      ok: true,
      payload: { userId: "session-user" },
    });
    exchangeCodeSpy.mockResolvedValue({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      token_type: "Bearer",
    });

    const before = Date.now();
    const res = await GET(makeRequest("?code=oauth-code&state=signed"));

    expect(exchangeCodeSpy).toHaveBeenCalledWith("oauth-code");
    expect(storeGoogleTokensSpy).toHaveBeenCalledTimes(1);
    const [userId, tokens, options] = storeGoogleTokensSpy.mock.calls[0] as [
      string,
      { access_token: string; refresh_token: string; expiry_date: number },
      { useAdmin: boolean },
    ];
    expect(userId).toBe("session-user");
    expect(tokens.access_token).toBe("access-token");
    expect(tokens.refresh_token).toBe("refresh-token");
    expect(tokens.expiry_date).toBeGreaterThanOrEqual(before + 3_600_000 - 100);
    expect(options).toEqual({ useAdmin: true });
    expect(res.headers.get("location")).toBe(
      "http://localhost/situation-room?gmail=connected",
    );
    expectClearedStateCookie(res);
    expect(logInfoSpy).toHaveBeenCalledWith("gmail.oauth.connected", {
      userId: "session-user",
    });
  });

  it("redirects to token_exchange_failed when exchange or storage throws", async () => {
    verifyOAuthStateSpy.mockReturnValue({
      ok: true,
      payload: { userId: "session-user" },
    });
    exchangeCodeSpy.mockRejectedValue(new Error("google down"));

    const res = await GET(makeRequest("?code=oauth-code&state=signed"));

    expect(res.headers.get("location")).toBe(
      "http://localhost/situation-room?error=token_exchange_failed",
    );
    expectClearedStateCookie(res);
    expect(logErrorSpy).toHaveBeenCalledWith(
      "gmail.oauth.token_exchange_failed",
      expect.any(Error),
      { userId: "session-user" },
    );
  });
});
