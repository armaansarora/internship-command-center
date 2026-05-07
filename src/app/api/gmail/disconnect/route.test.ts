import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for POST /api/gmail/disconnect.
 *
 * Settings promises that Gmail/Calendar can be disconnected at any time. This
 * locks the server-side half: auth gate, side-effect rate limit, token revoke,
 * and audit trail.
 */

const {
  requireUserSpy,
  rateLimitSpy,
  revokeGoogleTokensSpy,
  auditSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  revokeGoogleTokensSpy: vi.fn(),
  auditSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/gmail/oauth", () => ({
  revokeGoogleTokens: revokeGoogleTokensSpy,
}));

vi.mock("@/lib/audit/log", () => ({
  logSecurityEvent: auditSpy,
  requestMetadata: (req: Request) => ({
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    error: logErrorSpy,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const { POST } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-google", email: "fresh@example.com" },
};

const OK_RATE = {
  limited: false,
  headers: { "X-RateLimit-Limit": "5" },
  response: null,
};

function makeRequest(): Request {
  return new Request("http://localhost/api/gmail/disconnect", {
    method: "POST",
    headers: {
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "vitest/1",
    },
  });
}

describe("POST /api/gmail/disconnect", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    revokeGoogleTokensSpy.mockReset();
    auditSpy.mockReset();
    logErrorSpy.mockReset();
  });

  it("returns 401 when unauthenticated and never revokes tokens", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(revokeGoogleTokensSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 429 before revocation when rate limited", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-google", "C");
    expect(revokeGoogleTokensSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("revokes Google tokens, writes an audit row, and returns 200", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    revokeGoogleTokensSpy.mockResolvedValue(undefined);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ disconnected: true });
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(revokeGoogleTokensSpy).toHaveBeenCalledWith("user-google", {
      useAdmin: true,
    });
    expect(auditSpy).toHaveBeenCalledWith({
      userId: "user-google",
      eventType: "oauth_disconnected",
      resourceType: "google",
      metadata: { scopes: ["gmail", "calendar"] },
      ipAddress: "203.0.113.10",
      userAgent: "vitest/1",
    });
  });

  it("returns 500 and does not audit when revocation fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    revokeGoogleTokensSpy.mockRejectedValue(new Error("db down"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to disconnect Google",
    });
    expect(logErrorSpy).toHaveBeenCalledWith(
      "gmail.oauth.disconnect_failed",
      expect.any(Error),
      { userId: "user-google" },
    );
    expect(auditSpy).not.toHaveBeenCalled();
  });
});
