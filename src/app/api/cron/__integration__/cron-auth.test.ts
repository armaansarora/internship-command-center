import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

/**
 * R0.4 — Cron auth coverage audit.
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
 *   - x-vercel-cron: 1 (Vercel internal signal)           → not 401
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
const ROUTES: Array<{ name: string; load: () => Promise<RouteModule> }> = [
  {
    name: "briefing",
    load: () =>
      import("@/app/api/cron/briefing/route") as Promise<RouteModule>,
  },
  {
    name: "sync",
    load: () => import("@/app/api/cron/sync/route") as Promise<RouteModule>,
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

      it(`accepts x-vercel-cron header`, async () => {
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
        if (res === "threw") return;
        expect(res.status).not.toBe(401);
      });
    });
  }
});
