import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/canary-heartbeat
 *
 * Public liveness probe for the off-platform synthetic canary
 * (GitHub Actions, .github/workflows/canary.yml). Deliberately
 * unauthenticated — this route is the caller, not the callee, of
 * the canary loop and it must answer 200 to anyone who asks. It is
 * a trivially cheap JSON response so abuse cost is negligible.
 *
 * NOT listed in vercel.json `crons[]` — the canary is the scheduler,
 * not Vercel's internal cron. The job is still wrapped with
 * `withCronHealth("canary-heartbeat", …)` so every probe lands a row
 * in `cron_runs` and the owner can spot a missed canary tick the same
 * way they spot any other silently-failing job.
 *
 * Why this is safe to be unauthenticated:
 *   - response body contains only `{ ok, t, build }`; no secrets, no
 *     user data, no expensive AI calls.
 *   - `cache-control: no-store` so a probe never returns stale state.
 *   - the canary auth-audit (cron-auth.test.ts) explicitly excludes
 *     this route — see the EXEMPT_ROUTES allowlist there.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(_req: Request): Promise<Response> {
  const build =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const body = {
    ok: true,
    t: Math.floor(Date.now() / 1000),
    build,
  };
  return Response.json(body, {
    headers: { "cache-control": "no-store" },
  });
}

export const GET = withCronHealth("canary-heartbeat", handle);
