import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for POST /api/account/delete/cancel.
 *
 * Invariants:
 *   - 401 when unauthenticated (never reads or writes)
 *   - 429 when tier-C rate limit is exceeded
 *   - 409 when the profile has no deleted_at (nothing to cancel)
 *   - 410 when the 30-day cancel window has elapsed
 *   - 200 on success → nulls deleted_at + fires 'data_delete_canceled' audit
 *   - 500 when either the read or the update errors
 */

const {
  requireUserSpy,
  rateLimitSpy,
  selectSpy,
  selectEqSpy,
  singleSpy,
  updateSpy,
  updateEqSpy,
  auditSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  selectSpy: vi.fn(),
  selectEqSpy: vi.fn(),
  singleSpy: vi.fn(),
  updateSpy: vi.fn(),
  updateEqSpy: vi.fn(),
  auditSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: selectSpy,
      update: updateSpy,
    }),
  }),
}));

vi.mock("@/lib/audit/log", () => ({
  logSecurityEvent: auditSpy,
  requestMetadata: (req: Request) => ({
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  }),
}));

const { POST } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-abc", email: "owner@example.com" },
};
const OK_RATE = {
  limited: false,
  headers: {
    "X-RateLimit-Limit": "5",
    "X-RateLimit-Remaining": "4",
    "X-RateLimit-Reset": "0",
  },
  response: null,
};

interface ReadResult {
  data: { deleted_at: string | null } | null;
  error: { message: string } | null;
}

function chainRead(result: ReadResult): void {
  // select(col).eq(col, val).single() → result
  singleSpy.mockResolvedValue(result);
  selectEqSpy.mockReturnValue({ single: singleSpy });
  selectSpy.mockReturnValue({ eq: selectEqSpy });
}

function chainUpdate(result: { error: { message: string } | null }): void {
  updateEqSpy.mockResolvedValue(result);
  updateSpy.mockReturnValue({ eq: updateEqSpy });
}

function makeRequest(): Request {
  return new Request("http://localhost/api/account/delete/cancel", {
    method: "POST",
    headers: {
      "x-forwarded-for": "5.6.7.8",
      "user-agent": "vitest/2",
    },
  });
}

describe("POST /api/account/delete/cancel", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    selectSpy.mockReset();
    selectEqSpy.mockReset();
    singleSpy.mockReset();
    updateSpy.mockReset();
    updateEqSpy.mockReset();
    auditSpy.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(selectSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited (tier C)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "X-RateLimit-Limit": "5", "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-abc", "C");
    expect(selectSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 409 when deleted_at is null (nothing to cancel)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    chainRead({ data: { deleted_at: null }, error: null });

    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_scheduled");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 410 when the 30-day window has expired", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    const longAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    chainRead({ data: { deleted_at: longAgo }, error: null });

    const res = await POST(makeRequest());
    expect(res.status).toBe(410);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("window_expired");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 200, nulls deleted_at, and audits when still inside the window", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    // 5 days ago — well inside the 30-day window.
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    chainRead({ data: { deleted_at: recent }, error: null });
    chainUpdate({ error: null });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { canceled: boolean };
    expect(body.canceled).toBe(true);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [updateArg] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(updateArg.deleted_at).toBeNull();
    expect(updateEqSpy).toHaveBeenCalledWith("id", "user-abc");

    expect(auditSpy).toHaveBeenCalledTimes(1);
    const auditArg = auditSpy.mock.calls[0][0] as {
      userId: string;
      eventType: string;
      ipAddress?: string;
      userAgent?: string;
    };
    expect(auditArg.userId).toBe("user-abc");
    expect(auditArg.eventType).toBe("data_delete_canceled");
    expect(auditArg.ipAddress).toBe("5.6.7.8");
    expect(auditArg.userAgent).toBe("vitest/2");
  });

  it("returns 500 when the read errors", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    chainRead({ data: null, error: { message: "read failed" } });

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("read failed");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 500 when the update errors (after a valid read)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    chainRead({ data: { deleted_at: recent }, error: null });
    chainUpdate({ error: { message: "write failed" } });

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("write failed");
    expect(auditSpy).not.toHaveBeenCalled();
  });
});
