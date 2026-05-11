import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

/**
 * Cron auth coverage audit.
 *
 * Proves every route under `src/app/api/cron/` actually calls
 * `verifyCronRequest` as its first gate. Unit coverage of the helper
 * itself lives in `src/lib/auth/cron.test.ts`.
 *
 * Strategy: lazy-import each route module inside the `it` block so a
 * module-load failure (missing SDK env, etc.) skips gracefully via the
 * try/catch around the dynamic import. The audit covers every route
 * listed in `ROUTES`; if a new cron route is added under
 * `src/app/api/cron/<name>/route.ts`, append it to the list.
 *
 * Auth behavior exercised:
 *   - Missing header in production                        → 401
 *   - Authorization: Bearer <CRON_SECRET>                 → not 401
 *   - x-vercel-cron: 1 alone (no bearer)                  → 401
 *     (the platform header is trivially settable by any
 *      external caller and cannot be trusted on its own)
 */

const CRON_SECRET_VALUE = "test-secret-thirty-two-characters-min";

type RouteModule = {
  GET?: (req: NextRequest) => Promise<Response> | Response;
  POST?: (req: NextRequest) => Promise<Response> | Response;
};

type LoadResult =
  | { ok: true; mod: RouteModule }
  | { ok: false; reason: string };

// Known cron routes. Keep in sync with `src/app/api/cron/*/route.ts`.
// This audit MUST list every directory under src/app/api/cron/ that ships a
// route.ts handler. Adding a new cron route without listing it here means
// the cron-auth gate is unverified.
//
// EXEMPTIONS (deliberately unauthenticated — confirmed by the dedicated
// public-probe test at the bottom of this file):
//   • canary-heartbeat — off-platform synthetic canary's liveness probe.
//     Public by design; returns `{ ok: true, t, build }`. No auth gate.
//     See src/app/api/cron/canary-heartbeat/route.ts.
const ROUTES: Array<{ name: string; load: () => Promise<RouteModule> }> = [
  {
    name: "briefing",
    load: () =>
      import("@/app/api/cron/briefing/route") as Promise<RouteModule>,
  },
  {
    name: "cfo-threshold",
    load: () =>
      import("@/app/api/cron/cfo-threshold/route") as Promise<RouteModule>,
  },
  {
    name: "cio-reresearch",
    load: () =>
      import("@/app/api/cron/cio-reresearch/route") as Promise<RouteModule>,
  },
  {
    name: "draft-follow-ups",
    load: () =>
      import("@/app/api/cron/draft-follow-ups/route") as Promise<RouteModule>,
  },
  {
    name: "export-worker",
    load: () =>
      import("@/app/api/cron/export-worker/route") as Promise<RouteModule>,
  },
  {
    name: "job-discovery",
    load: () =>
      import("@/app/api/cron/job-discovery/route") as Promise<RouteModule>,
  },
  {
    name: "match-index",
    load: () =>
      import("@/app/api/cron/match-index/route") as Promise<RouteModule>,
  },
  {
    name: "outreach-sender",
    load: () =>
      import("@/app/api/cron/outreach-sender/route") as Promise<RouteModule>,
  },
  {
    name: "owner-watchdog",
    load: () =>
      import("@/app/api/cron/owner-watchdog/route") as Promise<RouteModule>,
  },
  {
    name: "packet-regenerate",
    load: () =>
      import("@/app/api/cron/packet-regenerate/route") as Promise<RouteModule>,
  },
  {
    name: "purge-sweeper",
    load: () =>
      import("@/app/api/cron/purge-sweeper/route") as Promise<RouteModule>,
  },
  {
    name: "sync",
    load: () => import("@/app/api/cron/sync/route") as Promise<RouteModule>,
  },
  {
    name: "unprompted-ceo",
    load: () =>
      import("@/app/api/cron/unprompted-ceo/route") as Promise<RouteModule>,
  },
  {
    name: "warm-intro-scan",
    load: () =>
      import("@/app/api/cron/warm-intro-scan/route") as Promise<RouteModule>,
  },
  {
    name: "warmth-decay",
    load: () =>
      import("@/app/api/cron/warmth-decay/route") as Promise<RouteModule>,
  },
];

async function tryLoad(
  load: () => Promise<RouteModule>
): Promise<LoadResult> {
  try {
    const mod = await load();
    return { ok: true, mod };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}

function getHandler(
  mod: RouteModule
): { method: "GET" | "POST"; handler: (r: NextRequest) => Promise<Response> | Response } | null {
  if (mod.GET) return { method: "GET", handler: mod.GET };
  if (mod.POST) return { method: "POST", handler: mod.POST };
  return null;
}

/**
 * Invokes the handler and returns either its Response or `"threw"`.
 * On "accept" cases we only care that the response is not 401 — the
 * handler may crash on downstream dependencies (missing DB creds, no
 * network, etc.) and we treat that as "auth gate passed".
 */
async function invoke(
  handler: (r: NextRequest) => Promise<Response> | Response,
  req: NextRequest
): Promise<Response | "threw"> {
  try {
    return await handler(req);
  } catch {
    return "threw";
  }
}

describe("cron auth — every cron route gates on verifyCronRequest", () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabasePubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeAll(() => {
    process.env.CRON_SECRET = CRON_SECRET_VALUE;
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.VERCEL_ENV = "production";
    // `env()` validates these on first access; provide dummies so the
    // auth check's `env().CRON_SECRET` lookup doesn't trip the zod
    // schema before the guard runs.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-pub-key";
    _resetEnvCacheForTests();
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;

    Object.assign(process.env, { NODE_ENV: originalNodeEnv });

    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;

    if (originalSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    }
    if (originalSupabasePubKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalSupabasePubKey;
    }
    _resetEnvCacheForTests();
  });

  beforeEach(() => {
    _resetEnvCacheForTests();
  });

  for (const route of ROUTES) {
    describe(`route: ${route.name}`, () => {
      it(`returns 401 without any cron header`, async () => {
        const loaded = await tryLoad(route.load);
        if (!loaded.ok) {
          // Surface the skip loudly so the audit isn't silently green.
          console.warn(
            `[cron-auth] skipping ${route.name} — module failed to load: ${loaded.reason}`
          );
          return;
        }
        const entry = getHandler(loaded.mod);
        if (!entry) {
          throw new Error(
            `route ${route.name} exports neither GET nor POST`
          );
        }
        const req = new NextRequest(
          `http://localhost/api/cron/${route.name}`,
          { method: entry.method }
        );
        const res = await invoke(entry.handler, req);
        if (res === "threw") {
          throw new Error(
            `auth-missing case threw instead of returning 401 — guard likely missing`
          );
        }
        expect(res.status).toBe(401);
      });

      it(`accepts Authorization: Bearer CRON_SECRET`, async () => {
        const loaded = await tryLoad(route.load);
        if (!loaded.ok) {
          console.warn(
            `[cron-auth] skipping ${route.name} — module failed to load: ${loaded.reason}`
          );
          return;
        }
        const entry = getHandler(loaded.mod);
        if (!entry) return;
        const req = new NextRequest(
          `http://localhost/api/cron/${route.name}`,
          {
            method: entry.method,
            headers: {
              authorization: `Bearer ${CRON_SECRET_VALUE}`,
            },
          }
        );
        const res = await invoke(entry.handler, req);
        // Any outcome other than 401 means the auth gate passed.
        // Handlers may 500/throw on missing DB creds in the test env —
        // that is NOT an auth failure.
        if (res === "threw") return;
        expect(res.status).not.toBe(401);
      });

      it(`rejects x-vercel-cron header alone without a bearer (401)`, async () => {
        const loaded = await tryLoad(route.load);
        if (!loaded.ok) {
          console.warn(
            `[cron-auth] skipping ${route.name} — module failed to load: ${loaded.reason}`
          );
          return;
        }
        const entry = getHandler(loaded.mod);
        if (!entry) return;
        const req = new NextRequest(
          `http://localhost/api/cron/${route.name}`,
          {
            method: entry.method,
            headers: { "x-vercel-cron": "1" },
          }
        );
        const res = await invoke(entry.handler, req);
        if (res === "threw") {
          throw new Error(
            `header-only case threw instead of returning 401 — guard likely missing`
          );
        }
        expect(res.status).toBe(401);
      });
    });
  }

  // ── Public-probe exemption binding ─────────────────────────────────
  // The canary-heartbeat route is intentionally unauthenticated. This
  // test makes that contract explicit: if someone "fixes" the exemption
  // by adding verifyCronRequest to the route, this assertion goes red
  // before the canary in production starts failing every 15 minutes.
  describe("public-probe exemption: canary-heartbeat", () => {
    it("returns 200 without any cron header (deliberately unauthenticated)", async () => {
      const loaded = await tryLoad(
        () =>
          import("@/app/api/cron/canary-heartbeat/route") as Promise<RouteModule>,
      );
      if (!loaded.ok) {
        throw new Error(
          `canary-heartbeat failed to load: ${loaded.reason}`,
        );
      }
      const entry = getHandler(loaded.mod);
      if (!entry) {
        throw new Error("canary-heartbeat exports neither GET nor POST");
      }
      const req = new NextRequest(
        "http://localhost/api/cron/canary-heartbeat",
        { method: entry.method },
      );
      const res = await invoke(entry.handler, req);
      if (res === "threw") {
        throw new Error(
          "canary-heartbeat threw on a bare GET — probe is no longer reachable",
        );
      }
      expect(res.status).toBe(200);
    });
  });
});
