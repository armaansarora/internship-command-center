import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for POST /api/account/export.
 *
 * Happy path:
 *   - 401 when unauthenticated
 *   - 429 when rate-limited (tier C)
 *   - 200 on success, flips data_export_status → 'queued' and fires a
 *     'data_exported' audit event with stage=queued
 *   - 500 on DB error (still returns rate-limit headers)
 */

const { requireUserSpy, rateLimitSpy, updateSpy, eqSpy, auditSpy } = vi.hoisted(
  () => ({
    requireUserSpy: vi.fn(),
    rateLimitSpy: vi.fn(),
    updateSpy: vi.fn(),
    eqSpy: vi.fn(),
    auditSpy: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
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

// Re-import after mocks.
const { POST } = await import("./route");

const OK_AUTH = { ok: true as const, user: { id: "user-xyz" } };
const OK_RATE = {
  limited: false,
  headers: {
    "X-RateLimit-Limit": "5",
    "X-RateLimit-Remaining": "4",
    "X-RateLimit-Reset": "0",
  },
  response: null,
};

function chainUpdate(result: { error: { message: string } | null }): void {
  // update(...).eq(...) → result
  eqSpy.mockResolvedValue(result);
  updateSpy.mockReturnValue({ eq: eqSpy });
}

function makeRequest(): Request {
  return new Request("http://localhost/api/account/export", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4", "user-agent": "vitest/1" },
  });
}

describe("POST /api/account/export", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    updateSpy.mockReset();
    eqSpy.mockReset();
    auditSpy.mockReset();
  });

  it("returns 401 when unauthenticated and never touches the DB", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited (tier C) and never queues", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "X-RateLimit-Limit": "5", "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-xyz", "C");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("queues the export, fires the audit event, and returns 200 on success", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    chainUpdate({ error: null });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { queued: boolean };
    expect(body.queued).toBe(true);

    // Rate-limit headers flow through on success.
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");

    // Update called with queued status + requested-at timestamp.
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [updateArg] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(updateArg.data_export_status).toBe("queued");
    expect(typeof updateArg.data_export_requested_at).toBe("string");
    // ISO timestamp round-trips.
    expect(
      () => new Date(updateArg.data_export_requested_at as string).toISOString(),
    ).not.toThrow();

    // Scoped to the authenticated user.
    expect(eqSpy).toHaveBeenCalledWith("id", "user-xyz");

    // Audit event fires with stage=queued AND request metadata.
    expect(auditSpy).toHaveBeenCalledTimes(1);
    const auditArg = auditSpy.mock.calls[0][0] as {
      userId: string;
      eventType: string;
      metadata: { stage: string };
      ipAddress?: string;
      userAgent?: string;
    };
    expect(auditArg.userId).toBe("user-xyz");
    expect(auditArg.eventType).toBe("data_exported");
    expect(auditArg.metadata.stage).toBe("queued");
    expect(auditArg.ipAddress).toBe("1.2.3.4");
    expect(auditArg.userAgent).toBe("vitest/1");
  });

  it("returns 500 (with rate-limit headers) when the queue update errors", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    chainUpdate({ error: { message: "postgres down" } });

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("postgres down");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    // Audit not fired on DB failure — stage=queued is only truthful if the
    // row actually flipped.
    expect(auditSpy).not.toHaveBeenCalled();
  });
});
