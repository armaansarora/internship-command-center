/**
 * Contract tests for GET /api/cron/warmth-decay.
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

const computeWarmthMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/contacts/warmth", () => ({ computeWarmth: computeWarmthMock }));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fixture: {
  contacts: Array<Record<string, unknown>>;
  readError: { message: string } | null;
  updateError: { message: string } | null;
  updatedIds: string[];
} = { contacts: [], readError: null, updateError: null, updatedIds: [] };

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "contacts") throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          // Mirrors the real chain: .select().range().order() — .order() is
          // the awaited terminal that returns the page.
          range: (from: number, to: number) => ({
            order: async () => ({
              data: fixture.readError ? null : fixture.contacts.slice(from, to + 1),
              error: fixture.readError,
            }),
          }),
        }),
        update: () => ({
          eq: async (_col: string, id: string) => {
            fixture.updatedIds.push(id);
            return { data: null, error: fixture.updateError };
          },
        }),
      };
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/warmth-decay", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

describe("GET /api/cron/warmth-decay", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    createNotificationMock.mockReset();
    computeWarmthMock.mockReset();
    fixture.contacts = [];
    fixture.readError = null;
    fixture.updateError = null;
    fixture.updatedIds = [];
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 500 when contacts read errors", async () => {
    fixture.readError = { message: "read broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("no-ops when computed warmth equals current warmth", async () => {
    fixture.contacts = [{ id: "c1", user_id: "u1", name: "A", warmth: 50, last_contact_at: "2026-05-01T00:00:00Z" }];
    computeWarmthMock.mockReturnValue(50);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { updated: number; alerted: number };
    expect(body.updated).toBe(0);
    expect(body.alerted).toBe(0);
  });

  it("updates warmth but does not alert when staying above cold threshold", async () => {
    fixture.contacts = [{ id: "c1", user_id: "u1", name: "A", warmth: 80, last_contact_at: "2026-05-01T00:00:00Z" }];
    computeWarmthMock.mockReturnValue(70);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { updated: number; alerted: number };
    expect(body.updated).toBe(1);
    expect(body.alerted).toBe(0);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("fires one alert on downward cold-threshold crossing", async () => {
    fixture.contacts = [{ id: "c1", user_id: "u1", name: "Alice", warmth: 40, last_contact_at: "2026-03-01T00:00:00Z" }];
    computeWarmthMock.mockReturnValue(25);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { alerted: number };
    expect(body.alerted).toBe(1);
    const args = createNotificationMock.mock.calls[0]?.[0] as {
      type: string;
      sourceAgent: string;
      sourceEntityId: string;
      channels: string[];
    };
    expect(args.type).toBe("contact-cooling");
    expect(args.sourceAgent).toBe("cno");
    expect(args.channels).toEqual(["pneumatic_tube"]);
    expect(args.sourceEntityId).toMatch(/^cooling-c1-w\d+$/);
  });

  it("does not alert when already below cold threshold", async () => {
    fixture.contacts = [{ id: "c1", user_id: "u1", name: "A", warmth: 20, last_contact_at: "2026-02-01T00:00:00Z" }];
    computeWarmthMock.mockReturnValue(10);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { alerted: number };
    expect(body.alerted).toBe(0);
  });

  it("does not alert on upward crossing", async () => {
    fixture.contacts = [{ id: "c1", user_id: "u1", name: "A", warmth: 15, last_contact_at: "2026-05-01T00:00:00Z" }];
    computeWarmthMock.mockReturnValue(80);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { alerted: number };
    expect(body.alerted).toBe(0);
  });

  it("uses default warmth of 50 when row.warmth is null", async () => {
    fixture.contacts = [{ id: "c1", user_id: "u1", name: "A", warmth: null, last_contact_at: "2026-03-01T00:00:00Z" }];
    computeWarmthMock.mockReturnValue(25);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { alerted: number };
    expect(body.alerted).toBe(1);
  });
});
