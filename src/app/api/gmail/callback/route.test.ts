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
  createClientSpy,
  requireUserSpy,
  exchangeCodeSpy,
  exchangeGoogleLoginCodeForIdTokenSpy,
  isEmailAllowedForBetaSpy,
  needsLobbyOnboardingAfterAuthSpy,
  signInWithIdTokenSpy,
  signOutSpy,
  storeGoogleTokensSpy,
  verifyGoogleLoginStateSpy,
  verifyOAuthStateSpy,
  logWarnSpy,
  logErrorSpy,
  logInfoSpy,
} = vi.hoisted(() => ({
  createClientSpy: vi.fn(),
  requireUserSpy: vi.fn(),
  exchangeCodeSpy: vi.fn(),
  exchangeGoogleLoginCodeForIdTokenSpy: vi.fn(),
  isEmailAllowedForBetaSpy: vi.fn(),
  needsLobbyOnboardingAfterAuthSpy: vi.fn(),
  signInWithIdTokenSpy: vi.fn(),
  signOutSpy: vi.fn(),
  storeGoogleTokensSpy: vi.fn(),
  verifyGoogleLoginStateSpy: vi.fn(),
  verifyOAuthStateSpy: vi.fn(),
  logWarnSpy: vi.fn(),
  logErrorSpy: vi.fn(),
  logInfoSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientSpy,
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

vi.mock("@/lib/auth/google-login-state", () => ({
  GOOGLE_LOGIN_STATE_COOKIE: "google_login_state",
  isGoogleLoginStateValue: (state: string | null | undefined) =>
    typeof state === "string" && state.startsWith("login_"),
  verifyGoogleLoginState: verifyGoogleLoginStateSpy,
}));

vi.mock("@/lib/auth/google-login-oauth", () => ({
  exchangeGoogleLoginCodeForIdToken: exchangeGoogleLoginCodeForIdTokenSpy,
}));

vi.mock("@/lib/auth/beta-gate", () => ({
  isEmailAllowedForBeta: isEmailAllowedForBetaSpy,
}));

vi.mock("@/lib/auth/post-auth-profile", () => ({
  needsLobbyOnboardingAfterAuth: needsLobbyOnboardingAfterAuthSpy,
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

function makeLoginRequest(search: string, cookie = "login-cookie"): NextRequest {
  return new NextRequest(`http://localhost/api/gmail/callback${search}`, {
    headers: cookie ? { cookie: `google_login_state=${cookie}` } : {},
  });
}

function expectClearedStateCookie(res: Response): void {
  const cookie = res.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("oauth_state_nonce=");
  expect(cookie).toContain("Path=/api/gmail");
  expect(cookie).toContain("Max-Age=0");
}

function expectClearedLoginCookie(res: Response): void {
  const cookie = res.headers.get("set-cookie") ?? "";
  expect(cookie).toContain("google_login_state=");
  expect(cookie).toContain("Path=/api/gmail");
  expect(cookie).toContain("Max-Age=0");
}

describe("GET /api/gmail/callback", () => {
  beforeEach(() => {
    createClientSpy.mockReset();
    requireUserSpy.mockReset();
    exchangeCodeSpy.mockReset();
    exchangeGoogleLoginCodeForIdTokenSpy.mockReset();
    isEmailAllowedForBetaSpy.mockReset();
    needsLobbyOnboardingAfterAuthSpy.mockReset();
    signInWithIdTokenSpy.mockReset();
    signOutSpy.mockReset();
    storeGoogleTokensSpy.mockReset();
    verifyGoogleLoginStateSpy.mockReset();
    verifyOAuthStateSpy.mockReset();
    logWarnSpy.mockReset();
    logErrorSpy.mockReset();
    logInfoSpy.mockReset();

    requireUserSpy.mockResolvedValue({
      id: "session-user",
      email: "fresh@example.com",
    });
    createClientSpy.mockResolvedValue({
      auth: {
        signInWithIdToken: signInWithIdTokenSpy,
        signOut: signOutSpy,
      },
    });
    signOutSpy.mockResolvedValue({ error: null });
    isEmailAllowedForBetaSpy.mockReturnValue(true);
    needsLobbyOnboardingAfterAuthSpy.mockResolvedValue(false);
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

  it("handles first-party Google login callbacks before requiring an existing session", async () => {
    const user = {
      id: "new-user",
      email: "invited@example.com",
      user_metadata: { full_name: "Invited User" },
    };
    verifyGoogleLoginStateSpy.mockReturnValue({
      ok: true,
      payload: {
        v: 1,
        state: "login-state",
        nonce: "login-nonce",
        next: "/settings",
        issuedAt: Date.now(),
      },
    });
    exchangeGoogleLoginCodeForIdTokenSpy.mockResolvedValue("id-token");
    signInWithIdTokenSpy.mockResolvedValue({
      data: { user, session: { user } },
      error: null,
    });

    const res = await GET(makeLoginRequest("?code=login-code&state=login-state"));

    expect(requireUserSpy).not.toHaveBeenCalled();
    expect(verifyGoogleLoginStateSpy).toHaveBeenCalledWith(
      "login-state",
      "login-cookie",
    );
    expect(exchangeGoogleLoginCodeForIdTokenSpy).toHaveBeenCalledWith("login-code");
    expect(signInWithIdTokenSpy).toHaveBeenCalledWith({
      provider: "google",
      token: "id-token",
      nonce: "login-nonce",
    });
    expect(isEmailAllowedForBetaSpy).toHaveBeenCalledWith("invited@example.com");
    expect(needsLobbyOnboardingAfterAuthSpy).toHaveBeenCalledWith(
      expect.any(Object),
      user,
    );
    expect(res.headers.get("location")).toBe("http://localhost/settings");
    expectClearedLoginCookie(res);
  });

  it("routes first-run Google login users back to the lobby", async () => {
    const user = { id: "new-user", email: "invited@example.com", user_metadata: {} };
    verifyGoogleLoginStateSpy.mockReturnValue({
      ok: true,
      payload: {
        v: 1,
        state: "login-state",
        nonce: "login-nonce",
        next: "/penthouse",
        issuedAt: Date.now(),
      },
    });
    exchangeGoogleLoginCodeForIdTokenSpy.mockResolvedValue("id-token");
    signInWithIdTokenSpy.mockResolvedValue({
      data: { user, session: { user } },
      error: null,
    });
    needsLobbyOnboardingAfterAuthSpy.mockResolvedValue(true);

    const res = await GET(makeLoginRequest("?code=login-code&state=login-state"));

    expect(res.headers.get("location")).toBe("http://localhost/lobby");
    expectClearedLoginCookie(res);
  });

  it("retries transient Supabase edge failures during first-party Google login", async () => {
    const user = {
      id: "new-user",
      email: "invited@example.com",
      user_metadata: {},
    };
    verifyGoogleLoginStateSpy.mockReturnValue({
      ok: true,
      payload: {
        v: 1,
        state: "login-state",
        nonce: "login-nonce",
        next: "/settings",
        issuedAt: Date.now(),
      },
    });
    exchangeGoogleLoginCodeForIdTokenSpy.mockResolvedValue("id-token");
    signInWithIdTokenSpy
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          message: "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON",
        },
      })
      .mockResolvedValueOnce({
        data: { user, session: { user } },
        error: null,
      });

    const res = await GET(makeLoginRequest("?code=login-code&state=login-state"));

    expect(signInWithIdTokenSpy).toHaveBeenCalledTimes(2);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "auth.google_login.supabase_exchange_retry",
      {
        attempt: 1,
        error: "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON",
      },
    );
    expect(res.headers.get("location")).toBe("http://localhost/settings");
    expectClearedLoginCookie(res);
  });

  it("routes persistent Supabase edge failures to auth_unavailable", async () => {
    verifyGoogleLoginStateSpy.mockReturnValue({
      ok: true,
      payload: {
        v: 1,
        state: "login-state",
        nonce: "login-nonce",
        next: "/settings",
        issuedAt: Date.now(),
      },
    });
    exchangeGoogleLoginCodeForIdTokenSpy.mockResolvedValue("id-token");
    signInWithIdTokenSpy.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON",
      },
    });

    const res = await GET(makeLoginRequest("?code=login-code&state=login-state"));

    expect(signInWithIdTokenSpy).toHaveBeenCalledTimes(3);
    expect(res.headers.get("location")).toBe(
      "http://localhost/lobby?error=auth_unavailable",
    );
    expectClearedLoginCookie(res);
  });

  it("routes thrown Supabase edge failures to auth_unavailable", async () => {
    verifyGoogleLoginStateSpy.mockReturnValue({
      ok: true,
      payload: {
        v: 1,
        state: "login-state",
        nonce: "login-nonce",
        next: "/settings",
        issuedAt: Date.now(),
      },
    });
    exchangeGoogleLoginCodeForIdTokenSpy.mockResolvedValue("id-token");
    signInWithIdTokenSpy.mockRejectedValue(
      new Error("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"),
    );

    const res = await GET(makeLoginRequest("?code=login-code&state=login-state"));

    expect(signInWithIdTokenSpy).toHaveBeenCalledTimes(3);
    expect(res.headers.get("location")).toBe(
      "http://localhost/lobby?error=auth_unavailable",
    );
    expectClearedLoginCookie(res);
  });

  it("routes hung Supabase exchanges to auth_unavailable without retrying", async () => {
    vi.useFakeTimers();
    try {
      verifyGoogleLoginStateSpy.mockReturnValue({
        ok: true,
        payload: {
          v: 1,
          state: "login-state",
          nonce: "login-nonce",
          next: "/settings",
          issuedAt: Date.now(),
        },
      });
      exchangeGoogleLoginCodeForIdTokenSpy.mockResolvedValue("id-token");
      signInWithIdTokenSpy.mockReturnValue(new Promise(() => {}));

      const pending = GET(makeLoginRequest("?code=login-code&state=login-state"));
      await vi.advanceTimersByTimeAsync(5_000);
      const res = await pending;

      expect(signInWithIdTokenSpy).toHaveBeenCalledTimes(1);
      expect(logWarnSpy).not.toHaveBeenCalledWith(
        "auth.google_login.supabase_exchange_retry",
        expect.any(Object),
      );
      expect(res.headers.get("location")).toBe(
        "http://localhost/lobby?error=auth_unavailable",
      );
      expectClearedLoginCookie(res);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects login callbacks outside the beta gate", async () => {
    verifyGoogleLoginStateSpy.mockReturnValue({
      ok: true,
      payload: {
        v: 1,
        state: "login-state",
        nonce: "login-nonce",
        next: "/penthouse",
        issuedAt: Date.now(),
      },
    });
    exchangeGoogleLoginCodeForIdTokenSpy.mockResolvedValue("id-token");
    signInWithIdTokenSpy.mockResolvedValue({
      data: {
        user: { id: "new-user", email: "guest@example.com", user_metadata: {} },
        session: null,
      },
      error: null,
    });
    isEmailAllowedForBetaSpy.mockReturnValue(false);

    const res = await GET(makeLoginRequest("?code=login-code&state=login-state"));

    expect(signOutSpy).toHaveBeenCalledOnce();
    expect(res.headers.get("location")).toBe(
      "http://localhost/lobby?error=beta_not_invited",
    );
    expectClearedLoginCookie(res);
  });

  it("rejects login callbacks with invalid state", async () => {
    verifyGoogleLoginStateSpy.mockReturnValue({
      ok: false,
      reason: "bad_signature",
    });

    const res = await GET(makeLoginRequest("?code=login-code&state=login-state"));

    expect(exchangeGoogleLoginCodeForIdTokenSpy).not.toHaveBeenCalled();
    expect(signInWithIdTokenSpy).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "http://localhost/lobby?error=auth_failed",
    );
    expectClearedLoginCookie(res);
  });
});
