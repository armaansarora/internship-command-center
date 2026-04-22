import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for POST /api/account/delete.
 *
 * Invariants:
 *   - 401 when unauthenticated (never touches DB or audit log)
 *   - 429 when rate-limited (tier C; never writes or audits)
 *   - 400 when confirmEmail is missing or doesn't match auth.user.email
 *   - 200 on success, flips user_profiles.deleted_at to now() and fires
 *     'data_delete_requested' audit with { window_days: 30 }
 *   - 500 on DB error (still includes rate-limit headers)
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

function chainUpdate(result: { error: { message: string } | null }): void {
  eqSpy.mockResolvedValue(result);
  updateSpy.mockReturnValue({ eq: eqSpy });
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/account/delete", {
    method: "POST",
    headers: {
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "vitest/1",
      "content-type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    updateSpy.mockReset();
    eqSpy.mockReset();
    auditSpy.mockReset();
  });

  it("returns 401 when unauthenticated and never touches DB", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(makeRequest({ confirmEmail: "owner@example.com" }));
    expect(res.status).toBe(401);
    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited (tier C) and never deletes", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "X-RateLimit-Limit": "5", "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await POST(makeRequest({ confirmEmail: "owner@example.com" }));
    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-abc", "C");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when confirmEmail is missing", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("email_mismatch");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
    // Rate-limit headers still attached on a 4xx.
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
  });

  it("returns 400 when confirmEmail doesn't match the authenticated email", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);

    const res = await POST(makeRequest({ confirmEmail: "attacker@example.com" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("email_mismatch");
    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("soft-deletes the profile, fires the audit event, and returns 200", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    chainUpdate({ error: null });

    const res = await POST(makeRequest({ confirmEmail: "owner@example.com" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { scheduledDeletionAt: string };
    // Response shape promises the caller when to expect hard-delete.
    expect(typeof body.scheduledDeletionAt).toBe("string");
    expect(() => new Date(body.scheduledDeletionAt).toISOString()).not.toThrow();

    // Rate-limit headers flow through.
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");

    // Update called with deleted_at = ISO string, scoped to the caller.
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [updateArg] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(typeof updateArg.deleted_at).toBe("string");
    expect(
      () => new Date(updateArg.deleted_at as string).toISOString(),
    ).not.toThrow();
    expect(eqSpy).toHaveBeenCalledWith("id", "user-abc");

    // Audit event: data_delete_requested + metadata.window_days + request
    // metadata forwarded.
    expect(auditSpy).toHaveBeenCalledTimes(1);
    const auditArg = auditSpy.mock.calls[0][0] as {
      userId: string;
      eventType: string;
      metadata: { window_days: number };
      ipAddress?: string;
      userAgent?: string;
    };
    expect(auditArg.userId).toBe("user-abc");
    expect(auditArg.eventType).toBe("data_delete_requested");
    expect(auditArg.metadata.window_days).toBe(30);
    expect(auditArg.ipAddress).toBe("1.2.3.4");
    expect(auditArg.userAgent).toBe("vitest/1");
  });

  it("returns 500 when the soft-delete update errors", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    chainUpdate({ error: { message: "postgres down" } });

    const res = await POST(makeRequest({ confirmEmail: "owner@example.com" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("postgres down");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    // Audit must NOT fire — we never actually flipped the row.
    expect(auditSpy).not.toHaveBeenCalled();
  });
});
