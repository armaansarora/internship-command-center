import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for GET /api/gmail/auth.
 *
 * This route is the Settings entry point for the combined Gmail + Calendar
 * OAuth flow. It must never emit a Google consent URL without a signed-in user,
 * rate-limit allowance, and httpOnly state nonce cookie.
 */

const {
  requireUserSpy,
  rateLimitSpy,
  gmailAuthUrlSpy,
  isProdSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  gmailAuthUrlSpy: vi.fn(),
  isProdSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/gmail/oauth", () => ({
  getGmailAuthUrl: gmailAuthUrlSpy,
}));

vi.mock("@/lib/env", () => ({
  isProd: isProdSpy,
}));

const { GET } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-oauth", email: "fresh@example.com" },
};

const OK_RATE = {
  limited: false,
  headers: {
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": "9",
  },
  response: null,
};

describe("GET /api/gmail/auth", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    gmailAuthUrlSpy.mockReset();
    isProdSpy.mockReset();
    isProdSpy.mockReturnValue(true);
  });

  it("returns 401 when unauthenticated and never builds a Google URL", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(gmailAuthUrlSpy).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns the rate-limit response before issuing a consent URL", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await GET();

    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-oauth");
    expect(gmailAuthUrlSpy).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns the Google consent URL and sets a production httpOnly nonce cookie", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    gmailAuthUrlSpy.mockReturnValue({
      url: "https://accounts.google.com/o/oauth2/v2/auth?scope=gmail",
      nonce: "nonce-from-state",
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(gmailAuthUrlSpy).toHaveBeenCalledWith("user-oauth");
    await expect(res.json()).resolves.toEqual({
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth?scope=gmail",
    });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("oauth_state_nonce=nonce-from-state");
    expect(cookie).toContain("Path=/api/gmail");
    expect(cookie).toContain("Max-Age=600");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
  });

  it("omits Secure only when the app is not running in production", async () => {
    isProdSpy.mockReturnValue(false);
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    gmailAuthUrlSpy.mockReturnValue({
      url: "https://accounts.google.com/o/oauth2/v2/auth?scope=gmail",
      nonce: "dev-nonce",
    });

    const res = await GET();
    const cookie = res.headers.get("set-cookie") ?? "";

    expect(cookie).toContain("oauth_state_nonce=dev-nonce");
    expect(cookie).not.toContain("Secure");
  });
});
