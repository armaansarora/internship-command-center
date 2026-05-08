import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserSpy,
  rateLimitSpy,
  syncGmailSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  syncGmailSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/gmail/sync", () => ({
  syncGmailForUser: syncGmailSpy,
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
const { GoogleApiError } = await import("@/lib/google/api-error");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-google", email: "fresh@example.com" },
};

const OK_RATE = {
  limited: false,
  headers: { "X-RateLimit-Limit": "10" },
  response: null,
};

describe("POST /api/gmail/sync", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    syncGmailSpy.mockReset();
    logErrorSpy.mockReset();
  });

  it("returns 401 when unauthenticated and never syncs", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await POST();

    expect(res.status).toBe(401);
    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(syncGmailSpy).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response before syncing", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await POST();

    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-google");
    expect(syncGmailSpy).not.toHaveBeenCalled();
  });

  it("returns Gmail sync counts on success", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    syncGmailSpy.mockResolvedValue({ synced: 2, classified: 1, failed: 0 });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    await expect(res.json()).resolves.toEqual({
      synced: 2,
      classified: 1,
      failed: 0,
    });
    expect(syncGmailSpy).toHaveBeenCalledWith("user-google", {
      useAdmin: true,
    });
  });

  it("returns a clear 409 when Google is not connected", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    syncGmailSpy.mockRejectedValue(new Error("No Google tokens found for user"));

    const res = await POST();

    expect(res.status).toBe(409);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    await expect(res.json()).resolves.toEqual({
      error: "Google workspace is not connected.",
      code: "GOOGLE_NOT_CONNECTED",
    });
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it("logs and returns 500 for unexpected sync failures", async () => {
    const err = new Error("Gmail API error: 500");
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    syncGmailSpy.mockRejectedValue(err);

    const res = await POST();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to sync Gmail.",
    });
    expect(logErrorSpy).toHaveBeenCalledWith(
      "gmail.sync.manual_failed",
      err,
      { userId: "user-google" },
    );
  });

  it("returns provider-configuration guidance when the Gmail API is disabled", async () => {
    const err = new GoogleApiError(
      "gmail",
      403,
      "PERMISSION_DENIED",
      "Gmail API has not been used in project 123 before or it is disabled.",
    );
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    syncGmailSpy.mockRejectedValue(err);

    const res = await POST();

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: "Google API access is not enabled for this Tower OAuth project.",
      code: "GOOGLE_API_DISABLED",
    });
    expect(logErrorSpy).toHaveBeenCalledWith(
      "gmail.sync.provider_disabled",
      err,
      { userId: "user-google" },
    );
  });
});
