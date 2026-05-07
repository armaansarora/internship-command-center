import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserSpy,
  rateLimitSpy,
  syncCalendarSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  syncCalendarSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/calendar/sync", () => ({
  syncCalendarEvents: syncCalendarSpy,
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
  headers: { "X-RateLimit-Limit": "10" },
  response: null,
};

describe("POST /api/calendar/sync", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    syncCalendarSpy.mockReset();
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
    expect(syncCalendarSpy).not.toHaveBeenCalled();
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
    expect(syncCalendarSpy).not.toHaveBeenCalled();
  });

  it("returns Calendar sync counts on success", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    syncCalendarSpy.mockResolvedValue(3);

    const res = await POST();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    await expect(res.json()).resolves.toEqual({ synced: 3 });
    expect(syncCalendarSpy).toHaveBeenCalledWith("user-google");
  });

  it("returns a clear 409 when Google is not connected", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    syncCalendarSpy.mockRejectedValue(new Error("No Google tokens found for user"));

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
    const err = new Error("Calendar API error: 500");
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    syncCalendarSpy.mockRejectedValue(err);

    const res = await POST();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to sync Google Calendar.",
    });
    expect(logErrorSpy).toHaveBeenCalledWith(
      "calendar.sync.manual_failed",
      err,
      { userId: "user-google" },
    );
  });
});
