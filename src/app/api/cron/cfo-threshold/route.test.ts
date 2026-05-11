/**
 * Contract tests for GET /api/cron/cfo-threshold.
 * Auth covered by integration audit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-05-15T12:00:00Z").getTime();

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const createNotificationMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries/notifications-rest", () => ({
  createNotification: createNotificationMock,
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fixtureBox: {
  applications: Array<Record<string, unknown>>;
  error: { message: string } | null;
} = { applications: [], error: null };

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "applications") throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          gte: () => ({
            range: async (from: number, to: number) => {
              if (fixtureBox.error) return { data: null, error: fixtureBox.error };
              return { data: fixtureBox.applications.slice(from, to + 1), error: null };
            },
          }),
        }),
      };
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/cfo-threshold", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

function appRow(userId: string, status: string, createdAt: Date): Record<string, unknown> {
  return { user_id: userId, status, created_at: createdAt.toISOString() };
}

describe("GET /api/cron/cfo-threshold", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    createNotificationMock.mockReset();
    fixtureBox.applications = [];
    fixtureBox.error = null;
    verifyMock.mockReturnValue({ ok: true });
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    vi.useRealTimers();
  });

  it("skips users below the MIN_APPS_8W threshold", async () => {
    const apps: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 5; i += 1) {
      apps.push(appRow("user-low", i < 3 ? "rejected" : "applied", new Date(NOW - (i < 3 ? 10 * DAY_MS : 2 * DAY_MS))));
    }
    fixtureBox.applications = apps;
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { notified: number };
    expect(body.notified).toBe(0);
    vi.useRealTimers();
  });

  it("notifies when conversion drops more than 5pp WoW", async () => {
    const apps: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 4; i += 1) {
      apps.push(appRow("user-drop", "interviewing", new Date(NOW - 10 * DAY_MS - i * 60_000)));
    }
    apps.push(appRow("user-drop", "applied", new Date(NOW - 10 * DAY_MS - 5 * 60_000)));
    apps.push(appRow("user-drop", "interviewing", new Date(NOW - 2 * DAY_MS)));
    for (let i = 0; i < 4; i += 1) {
      apps.push(appRow("user-drop", "applied", new Date(NOW - 2 * DAY_MS - i * 60_000)));
    }
    fixtureBox.applications = apps;
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { notified: number };
    expect(body.notified).toBe(1);
    const args = createNotificationMock.mock.calls[0]?.[0] as {
      type: string;
      sourceAgent: string;
      sourceEntityType: string;
      channels: string[];
      body: string;
    };
    expect(args.sourceAgent).toBe("cfo");
    expect(args.type).toBe("cfo-threshold");
    expect(args.channels).toEqual(["pneumatic_tube"]);
    expect(args.body).toMatch(/Conversion fell from 80% to 20%/);
    vi.useRealTimers();
  });

  it("does not notify when WoW drop is at or below 5pp", async () => {
    const apps: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 5; i += 1) {
      apps.push(appRow("user-flat", "interviewing", new Date(NOW - 10 * DAY_MS - i * 60_000)));
    }
    for (let i = 0; i < 5; i += 1) {
      apps.push(appRow("user-flat", "interviewing", new Date(NOW - 2 * DAY_MS - i * 60_000)));
    }
    fixtureBox.applications = apps;
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { notified: number };
    expect(body.notified).toBe(0);
    vi.useRealTimers();
  });

  it("does not halt the batch when notify fails for one user", async () => {
    const apps: Array<Record<string, unknown>> = [];
    for (const userId of ["u1", "u2"]) {
      for (let i = 0; i < 5; i += 1) {
        apps.push(appRow(userId, "interviewing", new Date(NOW - 10 * DAY_MS - i * 60_000)));
      }
      for (let i = 0; i < 5; i += 1) {
        apps.push(appRow(userId, "applied", new Date(NOW - 2 * DAY_MS - i * 60_000)));
      }
    }
    fixtureBox.applications = apps;
    createNotificationMock.mockRejectedValueOnce(new Error("first user blew up"));
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { notified: number };
    expect(body.notified).toBe(1);
    expect(createNotificationMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("returns 500 when applications fetch errors", async () => {
    fixtureBox.error = { message: "db broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    vi.useRealTimers();
  });
});
