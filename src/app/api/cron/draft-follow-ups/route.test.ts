/**
 * R7.6 — draft-follow-ups cron contract tests.
 *
 * Table-driven: each case builds a minimal Supabase admin fixture whose tables
 * (`user_profiles`, `applications`, `outreach_queue`, `contacts`, `notifications`)
 * return canned rows and capture inserts. We stub the AI draft helper so the
 * tests never hit the network, and lock the cron-auth guard open.
 *
 * Cases:
 *   - unauth → 401
 *   - one user at 03:00 local with 3 stale apps → 3 inserts + 1 notification
 *   - second invocation at 03:30 → 0 inserts (dedupe hit)
 *   - user at 12:00 local → 0 inserts (outside [02:00, 06:00))
 *   - 6 stale apps → only 5 drafts inserted (cap)
 *   - app already has pending_approval → that app skipped
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const adminMock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => adminMock,
}));

const genMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/structured/follow-up-draft", () => ({
  generateFollowUpDraft: genMock,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixture — minimal Supabase admin
// ---------------------------------------------------------------------------
interface FixtureRow extends Record<string, unknown> {}

interface Fixture {
  users: FixtureRow[];
  applications: FixtureRow[];
  outreachQueue: FixtureRow[];
  contacts: FixtureRow[];
  notifications: FixtureRow[];
  insertedOutreach: FixtureRow[];
  insertedNotifications: FixtureRow[];
}

/**
 * Build a Supabase-ish query builder that honors the cron's filter chain.
 * Handles the tables the cron actually touches in the order they're called.
 */
function buildFrom(fixture: Fixture) {
  return (table: string) => {
    if (table === "user_profiles") {
      return {
        select: () => ({
          is: async () => ({ data: fixture.users, error: null }),
        }),
      };
    }

    if (table === "applications") {
      return {
        select: () => ({
          eq: (_c1: string, userId: string) => ({
            in: (_c2: string, _statuses: string[]) => ({
              lt: (_c3: string, _cutoff: string) => ({
                order: () => ({
                  limit: async () => ({
                    data: fixture.applications.filter(
                      (a) => a.user_id === userId,
                    ),
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }

    if (table === "outreach_queue") {
      return {
        select: () => ({
          eq: (_c1: string, userId: string) => ({
            in: (_c2: string, appIds: string[]) => ({
              in: async (_c3: string, statuses: string[]) => ({
                data: fixture.outreachQueue.filter(
                  (r) =>
                    r.user_id === userId &&
                    appIds.includes(r.application_id as string) &&
                    statuses.includes(r.status as string),
                ),
                error: null,
              }),
            }),
          }),
        }),
        insert: async (payload: FixtureRow) => {
          fixture.insertedOutreach.push(payload);
          // Mirror into queue so a same-request follow-on dedupe would see it.
          fixture.outreachQueue.push({
            ...payload,
            status: payload.status ?? "pending_approval",
          });
          return { data: null, error: null };
        },
      };
    }

    if (table === "contacts") {
      return {
        select: () => ({
          in: async (_c: string, ids: string[]) => ({
            data: fixture.contacts.filter((c) => ids.includes(c.id as string)),
            error: null,
          }),
        }),
      };
    }

    if (table === "notifications") {
      return {
        insert: async (payload: FixtureRow) => {
          fixture.insertedNotifications.push(payload);
          return { data: null, error: null };
        },
      };
    }

    return {};
  };
}

function emptyFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    users: [],
    applications: [],
    outreachQueue: [],
    contacts: [],
    notifications: [],
    insertedOutreach: [],
    insertedNotifications: [],
    ...overrides,
  };
}

function makeRequest(authed = true): NextRequest {
  return new NextRequest("http://localhost/api/cron/draft-follow-ups", {
    method: "GET",
    headers: authed ? { authorization: "Bearer test-secret" } : {},
  });
}

async function callGet(authed = true): Promise<Response> {
  const { GET } = await import("./route");
  return GET(makeRequest(authed));
}

function staleDate(daysAgo = 10): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Pick a timezone whose current local hour is ∈ [2, 6) relative to the
 * system clock. We compute the offset against "HH" formatted in each zone
 * until we find one that sits in the window. This keeps the test
 * deterministic across runner machines / CI zones without mocking Date.
 */
function timezoneWithLocalHourIn(window: [number, number]): string {
  const zones = [
    "UTC",
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Sao_Paulo",
    "Atlantic/Azores",
    "Europe/London",
    "Europe/Paris",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Pacific/Auckland",
    "Pacific/Kiritimati",
  ];
  const now = new Date();
  for (const z of zones) {
    const h = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: z,
        hour: "2-digit",
        hour12: false,
      })
        .formatToParts(now)
        .find((p) => p.type === "hour")!.value,
    );
    const norm = h === 24 ? 0 : h;
    if (norm >= window[0] && norm < window[1]) return z;
  }
  throw new Error(`No IANA zone found with local hour in ${window.join("–")}`);
}

function timezoneWithLocalHourOutside(window: [number, number]): string {
  const zones = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];
  const now = new Date();
  for (const z of zones) {
    const h = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: z,
        hour: "2-digit",
        hour12: false,
      })
        .formatToParts(now)
        .find((p) => p.type === "hour")!.value,
    );
    const norm = h === 24 ? 0 : h;
    if (norm < window[0] || norm >= window[1]) return z;
  }
  throw new Error("No outside-window zone available");
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("GET /api/cron/draft-follow-ups", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-pub-key";
    _resetEnvCacheForTests();
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
    _resetEnvCacheForTests();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock.mockReturnValue({ ok: true });
    genMock.mockReset();
    adminMock.from.mockReset();
    genMock.mockResolvedValue({
      subject: "Reopening the Analyst role",
      body: "Three weeks on and one concrete update: my next project review ships Friday and touches the exact pipeline you described. Open to a 15-minute call this week?",
      tone: "direct" as const,
    });
  });

  it("returns 401 when cron auth fails", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "unauthorized" });
    const res = await callGet(false);
    expect(res.status).toBe(401);
  });

  it("creates 3 drafts + 1 notification for a user at 03:00 local with 3 stale apps", async () => {
    const tz = timezoneWithLocalHourIn([2, 6]);
    const fixture = emptyFixture({
      users: [{ id: "u-1", timezone: tz }],
      applications: [
        {
          id: "app-a",
          user_id: "u-1",
          company_name: "CBRE",
          role: "Analyst",
          contact_id: null,
          last_activity_at: staleDate(10),
        },
        {
          id: "app-b",
          user_id: "u-1",
          company_name: "JLL",
          role: "Associate",
          contact_id: null,
          last_activity_at: staleDate(12),
        },
        {
          id: "app-c",
          user_id: "u-1",
          company_name: "Hines",
          role: "Analyst",
          contact_id: null,
          last_activity_at: staleDate(14),
        },
      ],
    });

    adminMock.from.mockImplementation(buildFrom(fixture));

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      draftsCreated: number;
      notificationsCreated: number;
      usersSwept: number;
    };
    expect(j.usersSwept).toBe(1);
    expect(j.draftsCreated).toBe(3);
    expect(j.notificationsCreated).toBe(1);
    expect(fixture.insertedOutreach).toHaveLength(3);
    for (const r of fixture.insertedOutreach) {
      expect(r.status).toBe("pending_approval");
      expect(r.type).toBe("follow_up");
      expect(r.generated_by).toBe("coo_overnight");
      expect((r.metadata as { tone: string }).tone).toBe("direct");
    }
    expect(fixture.insertedNotifications).toHaveLength(1);
    const notif = fixture.insertedNotifications[0]!;
    expect(notif.type).toBe("overnight_drafts_ready");
    expect(notif.source_agent).toBe("coo");
    expect((notif.channels as string[])).toContain("pneumatic_tube");
    expect(notif.title).toContain("3");
  });

  it("creates 0 drafts on a second invocation (dedupe hit on pending_approval)", async () => {
    const tz = timezoneWithLocalHourIn([2, 6]);
    const fixture = emptyFixture({
      users: [{ id: "u-1", timezone: tz }],
      applications: [
        {
          id: "app-a",
          user_id: "u-1",
          company_name: "CBRE",
          role: "Analyst",
          contact_id: null,
          last_activity_at: staleDate(10),
        },
        {
          id: "app-b",
          user_id: "u-1",
          company_name: "JLL",
          role: "Associate",
          contact_id: null,
          last_activity_at: staleDate(12),
        },
      ],
      // Already have pending_approval rows from the earlier tick.
      outreachQueue: [
        {
          user_id: "u-1",
          application_id: "app-a",
          status: "pending_approval",
        },
        {
          user_id: "u-1",
          application_id: "app-b",
          status: "approved",
        },
      ],
    });

    adminMock.from.mockImplementation(buildFrom(fixture));

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      draftsCreated: number;
      notificationsCreated: number;
    };
    expect(j.draftsCreated).toBe(0);
    expect(j.notificationsCreated).toBe(0);
    expect(fixture.insertedOutreach).toHaveLength(0);
    expect(genMock).not.toHaveBeenCalled();
  });

  it("creates 0 drafts for a user whose local time is outside [02:00, 06:00)", async () => {
    const tz = timezoneWithLocalHourOutside([2, 6]);
    const fixture = emptyFixture({
      users: [{ id: "u-out", timezone: tz }],
      applications: [
        {
          id: "app-x",
          user_id: "u-out",
          company_name: "Outside Co",
          role: "Analyst",
          contact_id: null,
          last_activity_at: staleDate(10),
        },
      ],
    });

    adminMock.from.mockImplementation(buildFrom(fixture));

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      draftsCreated: number;
      usersSwept: number;
    };
    expect(j.usersSwept).toBe(0);
    expect(j.draftsCreated).toBe(0);
    expect(genMock).not.toHaveBeenCalled();
  });

  it("caps at 5 drafts per user even when 6 stale apps are eligible", async () => {
    const tz = timezoneWithLocalHourIn([2, 6]);
    const apps = Array.from({ length: 6 }, (_, i) => ({
      id: `app-${i}`,
      user_id: "u-many",
      company_name: `Co ${i}`,
      role: "Analyst",
      contact_id: null,
      last_activity_at: staleDate(8 + i),
    }));
    const fixture = emptyFixture({
      users: [{ id: "u-many", timezone: tz }],
      applications: apps,
    });

    adminMock.from.mockImplementation(buildFrom(fixture));

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as { draftsCreated: number };
    expect(j.draftsCreated).toBe(5);
    expect(fixture.insertedOutreach).toHaveLength(5);
    expect(genMock).toHaveBeenCalledTimes(5);
  });

  it("skips apps that already have a pending_approval row (mixed batch)", async () => {
    const tz = timezoneWithLocalHourIn([2, 6]);
    const fixture = emptyFixture({
      users: [{ id: "u-mix", timezone: tz }],
      applications: [
        {
          id: "app-blocked",
          user_id: "u-mix",
          company_name: "Already Queued",
          role: "Analyst",
          contact_id: null,
          last_activity_at: staleDate(10),
        },
        {
          id: "app-fresh",
          user_id: "u-mix",
          company_name: "New Draft",
          role: "Associate",
          contact_id: null,
          last_activity_at: staleDate(12),
        },
      ],
      outreachQueue: [
        {
          user_id: "u-mix",
          application_id: "app-blocked",
          status: "pending_approval",
        },
      ],
    });

    adminMock.from.mockImplementation(buildFrom(fixture));

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as { draftsCreated: number };
    expect(j.draftsCreated).toBe(1);
    expect(fixture.insertedOutreach).toHaveLength(1);
    expect((fixture.insertedOutreach[0] as { application_id: string }).application_id).toBe("app-fresh");
  });
});
