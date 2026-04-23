import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

/**
 * Contract tests for GET /api/cron/unprompted-ceo.
 *
 * Covers:
 *   - 401 when verifyCronRequest rejects.
 *   - 200 + aggregated response when the sweep runs across multiple users.
 *   - Notification insert shape (source_agent='ceo', priority, title, body,
 *     actions).
 *   - Per-user error isolation: user A throwing still processes user B.
 *
 * Threshold logic itself is covered by `unprompted-triggers.test.ts`. These
 * tests verify the I/O glue.
 */

const {
  verifyCronSpy,
  userProfilesSelectSpy,
  applicationsSelectSpy,
  notificationsSelectSpy,
  notificationsInsertSpy,
  logWarnSpy,
  logErrorSpy,
  logInfoSpy,
} = vi.hoisted(() => ({
  verifyCronSpy: vi.fn(),
  userProfilesSelectSpy: vi.fn(),
  applicationsSelectSpy: vi.fn(),
  notificationsSelectSpy: vi.fn(),
  notificationsInsertSpy: vi.fn(),
  logWarnSpy: vi.fn(),
  logErrorSpy: vi.fn(),
  logInfoSpy: vi.fn(),
}));

vi.mock("@/lib/auth/cron", () => ({
  verifyCronRequest: verifyCronSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: logInfoSpy,
    warn: logWarnSpy,
    error: logErrorSpy,
  },
}));

// A single builder shape covers user_profiles.select, applications.select,
// and notifications.select/insert by looking at the first method call.
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "user_profiles") {
        return {
          select: () => ({
            is: () => ({
              not: () => ({
                gt: () => userProfilesSelectSpy(),
              }),
            }),
          }),
        };
      }
      if (table === "applications") {
        return {
          select: () => ({
            eq: (_col: string, userId: string) =>
              applicationsSelectSpy(userId),
          }),
        };
      }
      if (table === "notifications") {
        return {
          select: () => ({
            eq: (_col: string, userId: string) => ({
              eq: () => ({
                gt: () => notificationsSelectSpy(userId),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => notificationsInsertSpy(row),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

const { GET } = await import("./route");

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/unprompted-ceo", {
    method: "GET",
    headers: { authorization: "Bearer secret" },
  });
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

describe("GET /api/cron/unprompted-ceo", () => {
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
    verifyCronSpy.mockReset();
    userProfilesSelectSpy.mockReset();
    applicationsSelectSpy.mockReset();
    notificationsSelectSpy.mockReset();
    notificationsInsertSpy.mockReset();
    logWarnSpy.mockReset();
    logErrorSpy.mockReset();
    logInfoSpy.mockReset();

    // Default: notifications inserts succeed.
    notificationsInsertSpy.mockResolvedValue({ error: null });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyCronSpy.mockReturnValue({ ok: false, error: "missing secret" });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(userProfilesSelectSpy).not.toHaveBeenCalled();
    expect(applicationsSelectSpy).not.toHaveBeenCalled();
  });

  it("returns 500 when the user_profiles fetch errors", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    userProfilesSelectSpy.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("db down");
    expect(logErrorSpy).toHaveBeenCalled();
  });

  it("sweeps two users, inserts the right notifications, and returns the aggregate", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    userProfilesSelectSpy.mockResolvedValue({
      data: [{ id: "u-offer" }, { id: "u-stale" }],
      error: null,
    });

    // u-offer: 1 new offer, no prior ceo notification → 1 decision (critical)
    // u-stale: 6 idle applied apps → 1 decision (stale_cluster, high)
    applicationsSelectSpy.mockImplementation((userId: string) => {
      if (userId === "u-offer") {
        return Promise.resolve({
          data: [
            {
              id: "app-offer",
              status: "offer",
              last_activity_at: null,
              updated_at: isoAgo(2 * HOUR),
              created_at: isoAgo(5 * DAY),
              company_name: "Scale AI",
              role: "ML Intern",
            },
          ],
          error: null,
        });
      }
      if (userId === "u-stale") {
        return Promise.resolve({
          data: Array.from({ length: 6 }, (_, i) => ({
            id: `stale-${i}`,
            status: "applied",
            last_activity_at: isoAgo(15 * DAY + i * HOUR),
            updated_at: isoAgo(15 * DAY),
            created_at: isoAgo(30 * DAY),
            company_name: `Company ${i}`,
            role: "Software Engineer Intern",
          })),
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });

    notificationsSelectSpy.mockResolvedValue({ data: [], error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      usersSwept: number;
      notificationsCreated: number;
      failed: string[];
    };
    expect(body.ok).toBe(true);
    expect(body.usersSwept).toBe(2);
    expect(body.notificationsCreated).toBe(2);
    expect(body.failed).toEqual([]);

    // Two inserts, each shaped correctly.
    expect(notificationsInsertSpy).toHaveBeenCalledTimes(2);
    const inserts = notificationsInsertSpy.mock.calls.map(
      (c) => c[0] as Record<string, unknown>,
    );
    for (const row of inserts) {
      expect(row.source_agent).toBe("ceo");
      expect(row.is_read).toBe(false);
      expect(row.is_dismissed).toBe(false);
      expect(Array.isArray(row.actions)).toBe(true);
      expect(row.actions).toEqual([{ label: "See briefing", floor: "1" }]);
      expect(typeof row.title).toBe("string");
      expect(typeof row.body).toBe("string");
    }

    const offerRow = inserts.find((r) => r.type === "offer_arrived");
    expect(offerRow).toBeDefined();
    expect(offerRow?.user_id).toBe("u-offer");
    expect(offerRow?.priority).toBe("critical");
    expect(offerRow?.source_entity_id).toBe("app-offer");
    expect(offerRow?.source_entity_type).toBe("application");
    expect(offerRow?.title).toBe("Offer in from Scale AI");

    const staleRow = inserts.find((r) => r.type === "stale_cluster");
    expect(staleRow).toBeDefined();
    expect(staleRow?.user_id).toBe("u-stale");
    expect(staleRow?.priority).toBe("high");
    expect(staleRow?.source_entity_id).toBeNull();
    expect(staleRow?.source_entity_type).toBeNull();
  });

  it("isolates per-user errors — user A throws, user B still processed", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    userProfilesSelectSpy.mockResolvedValue({
      data: [{ id: "u-bad" }, { id: "u-good" }],
      error: null,
    });

    applicationsSelectSpy.mockImplementation((userId: string) => {
      if (userId === "u-bad") {
        return Promise.resolve({
          data: null,
          error: { message: "rls reject" },
        });
      }
      return Promise.resolve({
        data: [
          {
            id: "good-offer",
            status: "offer",
            last_activity_at: null,
            updated_at: isoAgo(1 * HOUR),
            created_at: isoAgo(5 * DAY),
            company_name: "Anthropic",
            role: "Engineer",
          },
        ],
        error: null,
      });
    });

    notificationsSelectSpy.mockResolvedValue({ data: [], error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      usersSwept: number;
      notificationsCreated: number;
      failed: string[];
    };
    expect(body.failed).toEqual(["u-bad"]);
    expect(body.usersSwept).toBe(1);
    expect(body.notificationsCreated).toBe(1);

    // The bad user was logged; the good user's notification was inserted.
    expect(logWarnSpy).toHaveBeenCalledWith(
      "unprompted_ceo.user_failed",
      expect.objectContaining({ userId: "u-bad" }),
    );
    expect(notificationsInsertSpy).toHaveBeenCalledTimes(1);
    const row = notificationsInsertSpy.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(row.user_id).toBe("u-good");
  });

  it("suppresses an offer notification when one already exists for that app within 24h", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    userProfilesSelectSpy.mockResolvedValue({
      data: [{ id: "u-1" }],
      error: null,
    });

    applicationsSelectSpy.mockResolvedValue({
      data: [
        {
          id: "app-dedup",
          status: "offer",
          last_activity_at: null,
          updated_at: isoAgo(2 * HOUR),
          created_at: isoAgo(5 * DAY),
          company_name: "Scale",
          role: "ML Intern",
        },
      ],
      error: null,
    });

    notificationsSelectSpy.mockResolvedValue({
      data: [
        {
          source_agent: "ceo",
          source_entity_id: "app-dedup",
          source_entity_type: "application",
          created_at: isoAgo(1 * HOUR),
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      usersSwept: number;
      notificationsCreated: number;
    };
    expect(body.usersSwept).toBe(1);
    expect(body.notificationsCreated).toBe(0);
    expect(notificationsInsertSpy).not.toHaveBeenCalled();
  });

  it("returns 200 with zero counts when there are no active users", async () => {
    verifyCronSpy.mockReturnValue({ ok: true });
    userProfilesSelectSpy.mockResolvedValue({ data: [], error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      usersSwept: number;
      notificationsCreated: number;
    };
    expect(body.ok).toBe(true);
    expect(body.usersSwept).toBe(0);
    expect(body.notificationsCreated).toBe(0);
    expect(applicationsSelectSpy).not.toHaveBeenCalled();
  });
});
