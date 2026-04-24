import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockAssertConsented = vi.fn();
const mockCheckAndBumpRateLimit = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

// Supabase client mock: auth.getUser + from() chain.
const supabaseFromImpl = (table: string) => {
  if (table === "match_candidate_index") {
    return {
      select: () => ({
        eq: () => ({
          gt: () => ({
            order: () => ({
              limit: (_: number) => mockSelect(),
            }),
          }),
        }),
      }),
    };
  }
  if (table === "match_events") {
    return { insert: (payload: unknown) => mockInsert(payload) };
  }
  throw new Error(`unexpected table: ${table}`);
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: supabaseFromImpl,
  }),
}));

vi.mock("@/lib/networking/consent-guard", () => ({
  assertConsented: mockAssertConsented,
}));

vi.mock("@/lib/networking/rate-limit", () => ({
  checkAndBumpRateLimit: mockCheckAndBumpRateLimit,
}));

vi.mock("@/lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("GET /api/networking/match-candidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReset();
    mockAssertConsented.mockReset();
    mockCheckAndBumpRateLimit.mockReset();
    mockSelect.mockReset();
    mockInsert.mockReset();
    mockInsert.mockResolvedValue({ data: null, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockAssertConsented).not.toHaveBeenCalled();
  });

  it("returns 403 consent-required when guard returns consent-required", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    const blocked = Response.json(
      { ok: false, reason: "consent-required" },
      { status: 403 },
    );
    mockAssertConsented.mockResolvedValue(blocked);
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("consent-required");
    expect(mockCheckAndBumpRateLimit).not.toHaveBeenCalled();
  });

  it("returns 403 consent-version-stale when guard returns it", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    mockAssertConsented.mockResolvedValue(
      Response.json(
        { ok: false, reason: "consent-version-stale" },
        { status: 403 },
      ),
    );
    const { GET } = await import("../route");
    const res = await GET();
    expect((await res.json()).reason).toBe("consent-version-stale");
    expect(mockCheckAndBumpRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 rate-limited with retry_after_seconds", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    mockAssertConsented.mockResolvedValue(null);
    mockCheckAndBumpRateLimit.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 1234,
    });
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      reason: "rate-limited",
      retry_after_seconds: 1234,
    });
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 200 with candidates and writes audit log entries", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    mockAssertConsented.mockResolvedValue(null);
    mockCheckAndBumpRateLimit.mockResolvedValue({ ok: true, remaining: 19 });
    mockSelect.mockResolvedValue({
      data: [
        {
          counterparty_anon_key: "abc123",
          company_context: "Acme",
          edge_strength: "1.000",
        },
        {
          counterparty_anon_key: "def456",
          company_context: "Globex",
          edge_strength: "0.500",
        },
      ],
      error: null,
    });

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.candidates).toHaveLength(2);
    expect(body.rate_limit_remaining).toBe(19);

    // Audit log insert must have received a row per candidate.
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0];
    expect(Array.isArray(inserted)).toBe(true);
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({
      user_id: "u-1",
      counterparty_anon_key: "abc123",
      company_context: "Acme",
      edge_strength: "1.000",
      match_reason: "warm contact at Acme",
    });
  });

  it("returns 200 with empty candidates when index is empty — no audit log write", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    mockAssertConsented.mockResolvedValue(null);
    mockCheckAndBumpRateLimit.mockResolvedValue({ ok: true, remaining: 20 });
    mockSelect.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("../route");
    const res = await GET();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.candidates).toEqual([]);
    expect(body.rate_limit_remaining).toBe(20);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 500 when the index read errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    mockAssertConsented.mockResolvedValue(null);
    mockCheckAndBumpRateLimit.mockResolvedValue({ ok: true, remaining: 20 });
    mockSelect.mockResolvedValue({ data: null, error: { message: "db broken" } });
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).reason).toBe("read-error");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 500 audit-insert-failed if match_events insert fails (Red Team fail-closed)", async () => {
    // Post-R11 Red Team fix: audit log is atomic with match surfacing.
    // If match_events insert fails, we MUST NOT return candidates — the
    // audit log is the only mechanism that makes cross-user surfacing
    // traceable, and a silent-dropped audit row is indistinguishable
    // from a clean run on the request/response wire.
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    mockAssertConsented.mockResolvedValue(null);
    mockCheckAndBumpRateLimit.mockResolvedValue({ ok: true, remaining: 19 });
    mockSelect.mockResolvedValue({
      data: [
        {
          counterparty_anon_key: "k",
          company_context: "Acme",
          edge_strength: "1.000",
        },
      ],
      error: null,
    });
    mockInsert.mockResolvedValue({ data: null, error: { message: "audit broken" } });
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; reason: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("audit-insert-failed");
  });
});
