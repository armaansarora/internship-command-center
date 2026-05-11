/**
 * Contract tests for GET /api/cron/cio-reresearch.
 *
 * Auth covered by integration audit. These tests focus on the re-research
 * semantics: per-user cap, idempotency key, notification shape, error paths.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

interface Fixture {
  applications: Array<Record<string, unknown>>;
  companies: Array<Record<string, unknown>>;
  appsError?: { message: string } | null;
  staleError?: { message: string } | null;
  updateError?: { message: string } | null;
}

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const createNotificationMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/notifications-rest", () => ({
  createNotification: createNotificationMock,
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const updatedCompanyIds: string[] = [];
const fixtureBox: { current: Fixture } = {
  current: { applications: [], companies: [] },
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "applications") {
        return {
          select: () => ({
            in: () => ({
              not: async () => ({
                data: fixtureBox.current.appsError ? null : fixtureBox.current.applications,
                error: fixtureBox.current.appsError ?? null,
              }),
            }),
          }),
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            in: () => ({
              or: () => ({
                limit: async () => ({
                  data: fixtureBox.current.staleError ? null : fixtureBox.current.companies,
                  error: fixtureBox.current.staleError ?? null,
                }),
              }),
            }),
          }),
          update: () => ({
            eq: async (_col: string, id: string) => {
              updatedCompanyIds.push(id);
              return { data: null, error: fixtureBox.current.updateError ?? null };
            },
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/cio-reresearch", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

describe("GET /api/cron/cio-reresearch", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    createNotificationMock.mockReset();
    updatedCompanyIds.length = 0;
    fixtureBox.current = { applications: [], companies: [] };
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "Missing bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("returns refreshed:0 when no active applications", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { refreshed: number };
    expect(body.refreshed).toBe(0);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("refreshes one stale company and fires one notification", async () => {
    fixtureBox.current.applications = [
      { user_id: "user-a", company_id: "co-1", status: "applied" },
    ];
    fixtureBox.current.companies = [
      { id: "co-1", user_id: "user-a", name: "Acme", research_freshness: null },
    ];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { refreshed: number };
    expect(body.refreshed).toBe(1);
    expect(updatedCompanyIds).toEqual(["co-1"]);
    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    const args = createNotificationMock.mock.calls[0]?.[0] as {
      userId: string;
      type: string;
      sourceAgent: string;
      sourceEntityType: string;
      sourceEntityId: string;
      channels: string[];
    };
    expect(args.userId).toBe("user-a");
    expect(args.type).toBe("dossier-refresh");
    expect(args.sourceAgent).toBe("cio");
    expect(args.sourceEntityType).toBe("company");
    expect(args.channels).toEqual(["pneumatic_tube"]);
    const today = new Date().toISOString().slice(0, 10);
    expect(args.sourceEntityId).toBe(`cio-reresearch-co-1-${today}`);
  });

  it("caps refreshes at 3 per user", async () => {
    fixtureBox.current.applications = Array.from({ length: 5 }, (_, i) => ({
      user_id: "user-a",
      company_id: `co-${i + 1}`,
      status: "applied",
    }));
    fixtureBox.current.companies = Array.from({ length: 5 }, (_, i) => ({
      id: `co-${i + 1}`,
      user_id: "user-a",
      name: `Co${i}`,
      research_freshness: null,
    }));
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { refreshed: number };
    expect(body.refreshed).toBe(3);
    expect(createNotificationMock).toHaveBeenCalledTimes(3);
  });

  it("skips notification when company update fails", async () => {
    fixtureBox.current.applications = [
      { user_id: "user-a", company_id: "co-1", status: "applied" },
    ];
    fixtureBox.current.companies = [
      { id: "co-1", user_id: "user-a", name: "A", research_freshness: null },
    ];
    fixtureBox.current.updateError = { message: "update broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { refreshed: number };
    expect(body.refreshed).toBe(0);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("returns 500 when applications query errors", async () => {
    fixtureBox.current.appsError = { message: "apps broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("apps broken");
  });
});
