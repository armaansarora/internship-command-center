/**
 * Contract tests for GET /api/cron/canary-heartbeat.
 *
 * This is the heartbeat probe hit every 15 minutes by the
 * off-platform synthetic canary (`.github/workflows/canary.yml`).
 *
 * The route is deliberately unauthenticated — see route.ts and the
 * EXEMPT_ROUTES allowlist in src/app/api/cron/__integration__/cron-auth.test.ts.
 * These tests bind that public-by-design contract: a bare GET MUST
 * return 200 with a stable JSON envelope.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

// Silence the cron_runs telemetry side-effect. The route would
// otherwise try to insert into Supabase on every successful call;
// we don't care about that here — only the response shape.
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: async () => ({ data: null, error: null }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function makeRequest(): NextRequest {
  return new NextRequest(
    "http://localhost/api/cron/canary-heartbeat",
    { method: "GET" },
  );
}

describe("GET /api/cron/canary-heartbeat", () => {
  const originalBuildSha = process.env.VERCEL_GIT_COMMIT_SHA;

  beforeEach(() => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  afterAll(() => {
    if (originalBuildSha === undefined) {
      delete process.env.VERCEL_GIT_COMMIT_SHA;
    } else {
      process.env.VERCEL_GIT_COMMIT_SHA = originalBuildSha;
    }
  });

  it("returns 200 without any authorization header (public probe)", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it("returns JSON with ok:true and a numeric unix timestamp", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as {
      ok: boolean;
      t: number;
      build: string;
    };
    expect(body.ok).toBe(true);
    expect(typeof body.t).toBe("number");
    expect(Number.isFinite(body.t)).toBe(true);
    // Sanity: the timestamp is roughly "now" in seconds.
    const nowSec = Math.floor(Date.now() / 1000);
    expect(Math.abs(body.t - nowSec)).toBeLessThanOrEqual(5);
  });

  it("includes a build identifier — short sha or 'local'", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { build: string };
    expect(body.build).toBe("local");
  });

  it("uses the first 7 chars of VERCEL_GIT_COMMIT_SHA when set", async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "deadbeefcafebabe1234567890";
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { build: string };
    expect(body.build).toBe("deadbee");
  });

  it("sets cache-control: no-store so probes never serve stale state", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
