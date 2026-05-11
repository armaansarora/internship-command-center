/**
 * Contract tests for GET /api/cron/sync.
 * Auth covered by integration audit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const syncGmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/gmail/sync", () => ({ syncGmailForUser: syncGmailMock }));

const syncCalendarMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/calendar/sync", () => ({ syncCalendarEvents: syncCalendarMock }));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fixture = {
  pages: [] as Array<Array<{ id: string }>>,
  pagesError: null as { message: string } | null,
  staleCount: 0,
  existingAlerts: 0,
  insertedNotifications: [] as Array<Record<string, unknown>>,
};

let pageCallIndex = 0;

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "user_profiles") {
        return {
          select: () => ({
            not: () => ({
              range: () => ({
                order: async () => {
                  const page = fixture.pages[pageCallIndex] ?? [];
                  pageCallIndex += 1;
                  return {
                    data: fixture.pagesError ? null : page,
                    error: fixture.pagesError,
                  };
                },
              }),
            }),
          }),
        };
      }
      if (table === "contacts") {
        return {
          select: () => ({
            eq: () => ({
              lt: async () => ({ count: fixture.staleCount, error: null }),
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: async () => ({ count: fixture.existingAlerts, error: null }),
              }),
            }),
          }),
          insert: async (row: Record<string, unknown>) => {
            fixture.insertedNotifications.push(row);
            return { data: null, error: null };
          },
        };
      }
      throw new Error(`Unexpected ${table}`);
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/sync", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

describe("GET /api/cron/sync", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    syncGmailMock.mockReset();
    syncCalendarMock.mockReset();
    fixture.pages = [];
    fixture.pagesError = null;
    fixture.staleCount = 0;
    fixture.existingAlerts = 0;
    fixture.insertedNotifications = [];
    pageCallIndex = 0;
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 500 when user query errors", async () => {
    fixture.pagesError = { message: "db broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns zero totals when no users have Google tokens", async () => {
    fixture.pages = [[]];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { usersProcessed: number };
    expect(body.usersProcessed).toBe(0);
  });

  it("processes one user with Gmail + Calendar success", async () => {
    fixture.pages = [[{ id: "user-a" }]];
    syncGmailMock.mockResolvedValue({ synced: 3, classified: 2, failed: 0 });
    syncCalendarMock.mockResolvedValue(5);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      totals: { gmailSynced: number; calendarSynced: number };
      results: Array<{ userId: string; errors: string[] }>;
    };
    expect(body.totals.gmailSynced).toBe(3);
    expect(body.totals.calendarSynced).toBe(5);
    expect(body.results[0]?.errors).toEqual([]);
  });

  it("captures Gmail error but still runs Calendar", async () => {
    fixture.pages = [[{ id: "user-a" }]];
    syncGmailMock.mockRejectedValue(new Error("Gmail rotted"));
    syncCalendarMock.mockResolvedValue(5);
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      results: Array<{ errors: string[]; calendarSynced: number }>;
    };
    expect(body.results[0]?.errors[0]).toContain("Gmail");
    expect(body.results[0]?.calendarSynced).toBe(5);
  });

  it("inserts stale_contacts notification when count > 0 and no alert today", async () => {
    fixture.pages = [[{ id: "user-a" }]];
    fixture.staleCount = 5;
    fixture.existingAlerts = 0;
    syncGmailMock.mockResolvedValue({ synced: 0, classified: 0, failed: 0 });
    syncCalendarMock.mockResolvedValue(0);
    const { GET } = await import("./route");
    await GET(makeRequest());
    expect(fixture.insertedNotifications).toHaveLength(1);
    expect(fixture.insertedNotifications[0]?.type).toBe("stale_contacts");
    expect(String(fixture.insertedNotifications[0]?.body)).toContain("5 contacts");
  });

  it("does NOT insert stale_contacts notification when one already exists today", async () => {
    fixture.pages = [[{ id: "user-a" }]];
    fixture.staleCount = 5;
    fixture.existingAlerts = 1;
    syncGmailMock.mockResolvedValue({ synced: 0, classified: 0, failed: 0 });
    syncCalendarMock.mockResolvedValue(0);
    const { GET } = await import("./route");
    await GET(makeRequest());
    expect(fixture.insertedNotifications).toHaveLength(0);
  });
});
