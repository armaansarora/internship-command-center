/**
 * Contract tests for GET /api/cron/warm-intro-scan.
 * Auth covered by integration audit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const createNotificationMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/notifications-rest", () => ({
  createNotification: createNotificationMock,
}));

const findWarmIntrosMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/networking/warm-intro-finder", () => ({
  findWarmIntros: findWarmIntrosMock,
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fixture: {
  apps: { data: Array<Record<string, unknown>> | null; error: { message: string } | null };
  contactsByUser: Map<string, { data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
  embedsByUser: Map<string, { data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
  companies: Map<string, { name: string } | null>;
} = {
  apps: { data: [], error: null },
  contactsByUser: new Map(),
  embedsByUser: new Map(),
  companies: new Map(),
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "applications") {
        return { select: () => ({ in: () => ({ not: async () => fixture.apps }) }) };
      }
      if (table === "contacts") {
        return {
          select: () => ({
            eq: async (_col: string, userId: string) =>
              fixture.contactsByUser.get(userId) ?? { data: [], error: null },
          }),
        };
      }
      if (table === "company_embeddings") {
        return {
          select: () => ({
            eq: async (_col: string, userId: string) =>
              fixture.embedsByUser.get(userId) ?? { data: [], error: null },
          }),
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            // Batched name lookup: .select("id, name").in("id", ids)
            in: async (_col: string, ids: string[]) => ({
              data: ids
                .map((id) => {
                  const c = fixture.companies.get(id);
                  return c ? { id, name: c.name } : null;
                })
                .filter(Boolean),
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/warm-intro-scan", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

describe("GET /api/cron/warm-intro-scan", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    createNotificationMock.mockReset();
    findWarmIntrosMock.mockReset();
    fixture.apps = { data: [], error: null };
    fixture.contactsByUser.clear();
    fixture.embedsByUser.clear();
    fixture.companies.clear();
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns proposals:0 when no active applications", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { proposals: number };
    expect(body.proposals).toBe(0);
    expect(findWarmIntrosMock).not.toHaveBeenCalled();
  });

  it("returns 500 when apps read errors", async () => {
    fixture.apps = { data: null, error: { message: "apps broken" } };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("skips a user whose embeddings are empty", async () => {
    fixture.apps = { data: [{ id: "app-a", user_id: "user-a", company_id: "co-a" }], error: null };
    fixture.contactsByUser.set("user-a", { data: [{ id: "c1", name: "A", company_id: null }], error: null });
    fixture.embedsByUser.set("user-a", { data: [], error: null });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(findWarmIntrosMock).not.toHaveBeenCalled();
  });

  it("fires one notification per warm-intro proposal with the expected source_entity_id", async () => {
    fixture.apps = { data: [{ id: "app-a", user_id: "user-a", company_id: "co-a" }], error: null };
    fixture.contactsByUser.set("user-a", { data: [{ id: "c1", name: "Alice", company_id: "co-x" }], error: null });
    fixture.embedsByUser.set("user-a", { data: [{ company_id: "co-x", embedding: [1, 2, 3] }], error: null });
    fixture.companies.set("co-a", { name: "Stripe" });
    findWarmIntrosMock.mockReturnValue([
      { contactId: "c1", contactName: "Alice", applicationId: "app-a", toCompanyId: "co-a", score: 0.9 },
    ]);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { proposals: number };
    expect(body.proposals).toBe(1);
    const args = createNotificationMock.mock.calls[0]?.[0] as {
      type: string;
      sourceAgent: string;
      sourceEntityId: string;
      channels: string[];
      body: string;
    };
    expect(args.type).toBe("warm-intro");
    expect(args.sourceAgent).toBe("cno");
    expect(args.channels).toEqual(["pneumatic_tube"]);
    expect(args.sourceEntityId).toBe("warm-intro-c1-app-a");
    expect(args.body).toContain("Stripe");
  });
});
