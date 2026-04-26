/**
 * GET /api/cron/match-index contract tests.
 *
 * Scope:
 *   - 401 when verifyCronRequest rejects.
 *   - 200 + ok:true + processed:0 when no consented users exist.
 *   - 200 + per-user results when two consented users are processed.
 *   - A thrown per-user rebuild is isolated: that user is recorded as
 *     "error", others proceed "ok".
 *
 * Mocks `@/lib/networking/rebuild-match-index` directly so we exercise
 * the cron's iteration + worker-pool + error isolation, not the helper.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

// user_profiles is the only table the cron reads directly; rebuild does
// the rest of the DB work for each user, which we stub out.
interface AdminFixture {
  profiles: Array<{ id: string }>;
  fetchError: { message: string } | null;
}
const fixture: AdminFixture = { profiles: [], fetchError: null };
function resetFixture(): void {
  fixture.profiles = [];
  fixture.fetchError = null;
}

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "user_profiles") {
        throw new Error(`unexpected table in cron fixture: ${table}`);
      }
      return {
        select: () => ({
          not: (_col: string, _op: string, _val: null) => ({
            range: (_from: number, _to: number) => ({
              order: async () => {
                if (fixture.fetchError) {
                  return { data: null, error: fixture.fetchError };
                }
                return { data: fixture.profiles, error: null };
              },
            }),
          }),
        }),
      };
    },
  }),
}));

const rebuildMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/networking/rebuild-match-index", () => ({
  rebuildMatchIndexForUser: rebuildMock,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeRequest(authed = true): NextRequest {
  return new NextRequest("http://localhost/api/cron/match-index", {
    method: "GET",
    headers: authed ? { authorization: "Bearer test-secret" } : {},
  });
}

async function callGet(authed = true): Promise<Response> {
  const { GET } = await import("../route");
  return GET(makeRequest(authed));
}

describe("GET /api/cron/match-index", () => {
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
    resetFixture();
    verifyMock.mockReset();
    rebuildMock.mockReset();
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "unauthorized" });
    const res = await callGet(false);
    expect(res.status).toBe(401);
    expect(rebuildMock).not.toHaveBeenCalled();
  });

  it("returns ok:true with processed=0 when there are no consented users", async () => {
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      processed: number;
      results: unknown[];
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.results).toEqual([]);
    expect(rebuildMock).not.toHaveBeenCalled();
  });

  it("calls rebuildMatchIndexForUser once per consented user and returns per-user results", async () => {
    fixture.profiles.push({ id: "u-A" }, { id: "u-B" });
    rebuildMock.mockImplementation(async (userId: string) => {
      if (userId === "u-A") return { written: 3 };
      if (userId === "u-B") return { written: 0 };
      throw new Error("unexpected user");
    });

    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      processed: number;
      results: Array<{ userId: string; status: string; written?: number }>;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(2);
    expect(rebuildMock).toHaveBeenCalledTimes(2);
    // Order isn't guaranteed by the worker pool, so sort before asserting.
    const sorted = [...body.results].sort((a, b) =>
      a.userId.localeCompare(b.userId),
    );
    expect(sorted).toEqual([
      { userId: "u-A", status: "ok", written: 3 },
      { userId: "u-B", status: "ok", written: 0 },
    ]);
  });

  it("continues past a single user's thrown error and records the failure", async () => {
    fixture.profiles.push({ id: "u-A" }, { id: "u-B" });
    rebuildMock.mockImplementation(async (userId: string) => {
      if (userId === "u-B") throw new Error("database exploded");
      return { written: 2 };
    });

    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      processed: number;
      results: Array<{ userId: string; status: string; written?: number }>;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(2);
    expect(rebuildMock).toHaveBeenCalledTimes(2);
    const byUser = Object.fromEntries(body.results.map((r) => [r.userId, r]));
    expect(byUser["u-A"]?.status).toBe("ok");
    expect(byUser["u-A"]?.written).toBe(2);
    expect(byUser["u-B"]?.status).toBe("error");
  });
});
