import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Contract tests for GET /api/comp-bands/lookup.
 *
 * Happy path:
 *   - 401 when unauthenticated
 *   - 400 when required params (company, role, location) are missing
 *   - 200 on success, proxying the LookupResult from lookupCompBands
 */

const { requireUserSpy, createClientSpy, adminSpy, lookupSpy } = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  createClientSpy: vi.fn(),
  adminSpy: vi.fn(),
  lookupSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: adminSpy,
}));

vi.mock("@/lib/comp-bands/lookup", () => ({
  lookupCompBands: lookupSpy,
}));

const { GET } = await import("./route");

const OK_AUTH = { ok: true as const, user: { id: "user-xyz" } };

function makeRequest(qs: string): Request {
  return new Request(`http://localhost/api/comp-bands/lookup${qs}`);
}

describe("GET /api/comp-bands/lookup", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    createClientSpy.mockReset();
    adminSpy.mockReset();
    lookupSpy.mockReset();
    createClientSpy.mockResolvedValue({ tag: "user" });
    adminSpy.mockReturnValue({ tag: "admin" });
  });

  it("returns 401 when unauthenticated", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await GET(
      makeRequest("?company=Meta&role=Software%20Engineer&location=NYC"),
    );
    expect(res.status).toBe(401);
    expect(lookupSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when company/role/location is missing", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);

    // missing location
    const res1 = await GET(makeRequest("?company=Meta&role=SWE"));
    expect(res1.status).toBe(400);
    const body1 = (await res1.json()) as { error: string };
    expect(body1.error).toBe("missing_params");

    // missing role
    const res2 = await GET(makeRequest("?company=Meta&location=NYC"));
    expect(res2.status).toBe(400);

    // missing company
    const res3 = await GET(makeRequest("?role=SWE&location=NYC"));
    expect(res3.status).toBe(400);

    expect(lookupSpy).not.toHaveBeenCalled();
  });

  it("returns 200 with the LookupResult on happy path", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    lookupSpy.mockResolvedValue({
      ok: true,
      base: { p25: 180000, p50: 220000, p75: 280000 },
      bonus: { p25: 25000, p50: 40000, p75: 60000 },
      equity: { p25: 80000, p50: 120000, p75: 200000 },
      sampleSize: 312,
      source: "levels.fyi",
      fromCache: true,
    });

    const res = await GET(
      makeRequest(
        "?company=Meta&role=Software%20Engineer&location=New%20York%2C%20NY&level=E4",
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      base: { p50: number };
      fromCache: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.base.p50).toBe(220000);
    expect(body.fromCache).toBe(true);

    expect(lookupSpy).toHaveBeenCalledTimes(1);
    const [userArg, adminArg, input] = lookupSpy.mock.calls[0] as [
      { tag: string },
      { tag: string },
      { company: string; role: string; location: string; level?: string },
    ];
    expect(userArg.tag).toBe("user");
    expect(adminArg.tag).toBe("admin");
    expect(input).toEqual({
      company: "Meta",
      role: "Software Engineer",
      location: "New York, NY",
      level: "E4",
    });
  });
});
