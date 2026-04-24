import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES, loadFixture } from "../helpers/fixtures";

type MatchCandidateRow = {
  user_id: string;
  counterparty_anon_key: string;
  company_context: string;
  edge_strength: number;
  invalidates_at: string;
};

const aliceCandidates = loadFixture<MatchCandidateRow[]>(
  "match-candidates/alice.json",
);

/**
 * R12.8 carryover — R11 rate-limit end-to-end.
 *
 * Binds three invariants jsdom could not reach:
 *
 *   2a — OVER-THRESHOLD: 21 sequential GETs; calls 1-20 hit the Postgres
 *        RPC (`bump_match_rate_limit`) and return 200; call 21 returns a
 *        typed 429 with retry-after information.
 *
 *   2b — RPC ERROR: when the rate-limit RPC returns a PostgREST error
 *        (`{data: null, error: {message: "rpc error"}}`) the route MUST
 *        NOT return 200. R11 Red Team noted fail-closed behaviour — a
 *        500 would be the cleanest contract signal. The route currently
 *        surfaces 429 with `reason: "rate-limited"` because
 *        `checkAndBumpRateLimit` returns `{ok: false}` on error. Either
 *        shape satisfies "NOT 200"; a 500 is preferred.
 *
 *   2c — RPC TIMEOUT / THROW: when the RPC call is aborted (transport
 *        error) the fetch() rejects; `checkAndBumpRateLimit` enters the
 *        catch branch and returns `{ok: false}`. Route must surface a
 *        non-200 status — 500 preferred, 429 accepted.
 *
 * Shared mock strategy: overlay a stateful route handler AHEAD of the
 * default mock so we can count invocations, shape the response, and
 * distinguish scenarios within a single file.
 */

test.describe(
  "rate-limit over-threshold — /api/networking/match-candidates — 21st request returns typed 429",
  () => {
    let rpcCallCount = 0;

    test.beforeEach(async ({ page }) => {
      rpcCallCount = 0;

      await signInAs(page, USERS.alice, {
        tables: {
          user_profiles: [
            {
              id: USERS.alice.id,
              networking_consent_at: TIMES.anchor,
              networking_revoked_at: null,
              networking_consent_version: 2,
            },
          ],
          match_candidate_index: aliceCandidates,
        },
        rpc: {
          // Placeholder — the overlay below takes precedence and
          // tracks call count. This entry exists so the default
          // handler doesn't 404 on unexpected fall-through.
          bump_match_rate_limit: { allowed: true, count: 1 },
        },
        allowWrites: true,
      });

      await page.route(
        /\.supabase\.co\/rest\/v1\/rpc\/bump_match_rate_limit/,
        async (route: Route) => {
          rpcCallCount += 1;
          // Calls 1-20 allowed; the 21st trips the limit.
          const count = rpcCallCount;
          const allowed = count <= 20;
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ allowed, count }),
            contentType: "application/json",
          });
        },
      );
    });

    test(
      "rate-limit over-threshold — /api/networking/match-candidates — 21st request returns typed 429",
      async ({ page }) => {
        const statuses: number[] = [];
        const bodies: string[] = [];
        const retryAfterHeaders: (string | undefined)[] = [];

        for (let i = 0; i < 21; i++) {
          const res = await page.request.get(
            "http://localhost:3000/api/networking/match-candidates",
          );
          statuses.push(res.status());
          bodies.push(await res.text());
          retryAfterHeaders.push(res.headers()["retry-after"]);
        }

        // Calls 1-20: 200 OK.
        for (let i = 0; i < 20; i++) {
          expect(
            statuses[i],
            `call #${i + 1} expected 200, got ${statuses[i]}; body=${bodies[i]}`,
          ).toBe(200);
        }

        // Call 21: typed 429.
        expect(
          statuses[20],
          `call #21 expected 429, got ${statuses[20]}; body=${bodies[20]}`,
        ).toBe(429);

        // Body carries rate-limit signal (case-insensitive).
        expect(bodies[20].toLowerCase()).toMatch(/rate|limit/);

        // Retry-After HTTP header present on the 429. RFC 7231 §7.1.3
        // standard for 429/503. The route currently returns
        // retry_after_seconds in the JSON body only; if this assertion
        // fails it's a header-contract gap worth flagging.
        // REGRESSION CANDIDATE: route.ts does NOT call
        // `headers.set("Retry-After", ...)` — the retry window lives in
        // the JSON body under `retry_after_seconds`. RFC convention
        // expects both. Main thread can decide whether to tighten the
        // route or relax this assertion.
        expect(
          retryAfterHeaders[20],
          "expected Retry-After HTTP header on 429 per RFC 7231 §7.1.3",
        ).toBeTruthy();

        // RPC was called exactly 21 times — the route did NOT
        // short-circuit past the rate-limit gate.
        expect(rpcCallCount, "rate-limit RPC should be called for every request").toBe(21);
      },
    );
  },
);

test.describe(
  "rate-limit RPC error — route — fail-closed 500 not 200",
  () => {
    test.beforeEach(async ({ page }) => {
      await signInAs(page, USERS.alice, {
        tables: {
          user_profiles: [
            {
              id: USERS.alice.id,
              networking_consent_at: TIMES.anchor,
              networking_revoked_at: null,
              networking_consent_version: 2,
            },
          ],
          match_candidate_index: aliceCandidates,
        },
        allowWrites: true,
      });

      // Force the RPC to surface a PostgREST-shaped error. The SDK
      // parses a non-2xx body into `error = JSON.parse(body)` so
      // `{message: "rpc error"}` lands as `{data: null, error: {...}}`
      // inside checkAndBumpRateLimit.
      await page.route(
        /\.supabase\.co\/rest\/v1\/rpc\/bump_match_rate_limit/,
        async (route: Route) => {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({
              code: "P0001",
              message: "rpc error",
              details: "simulated rate-limit RPC failure",
              hint: null,
            }),
            contentType: "application/json",
          });
        },
      );
    });

    test(
      "rate-limit RPC error — route — fail-closed 500 not 200",
      async ({ page }) => {
        const res = await page.request.get(
          "http://localhost:3000/api/networking/match-candidates",
        );
        const status = res.status();
        const body = await res.text();

        // Primary bind: MUST NOT be 200. 200 would mean the route
        // returned candidates while the rate-limit counter failed —
        // exactly the bypass R11 Red Team called out.
        expect(
          status,
          `expected non-200 on rate-limit RPC failure; got ${status} body=${body}`,
        ).not.toBe(200);

        // Strict bind: task spec asks for 500 (route-level fail-closed
        // signal). The route currently surfaces 429 via the
        // `checkAndBumpRateLimit` → `{ok: false}` → NextResponse 429
        // path — which is fail-closed in spirit (request denied) but
        // confuses "rate-limited" with "rate-limit subsystem broken".
        // REGRESSION CANDIDATE: route.ts maps all rate-limit failures
        // to 429 regardless of root cause; a genuine RPC error should
        // arguably return 500 with a distinct reason code so callers
        // can tell "you hit the ceiling" from "our limiter is down."
        // Main thread: if this fails at run-time, open
        // `tower block R12.8 "rate-limit RPC error → route returns 429
        // not 500; fails to differentiate rate-hit from subsystem fault"`.
        expect(
          status,
          `task spec asks for 500 on RPC error; got ${status} body=${body}`,
        ).toBe(500);

        // Body must carry a recognizable signal — rate-limit / audit /
        // error code — so clients can decide whether to retry or
        // surface a distinct error.
        expect(body.toLowerCase()).toMatch(/rate-limit|rate_limit|audit|error|unknown/);
      },
    );
  },
);

test.describe(
  "rate-limit RPC aborted — route — non-200 surfaced not swallowed",
  () => {
    test.beforeEach(async ({ page }) => {
      await signInAs(page, USERS.alice, {
        tables: {
          user_profiles: [
            {
              id: USERS.alice.id,
              networking_consent_at: TIMES.anchor,
              networking_revoked_at: null,
              networking_consent_version: 2,
            },
          ],
          match_candidate_index: aliceCandidates,
        },
        allowWrites: true,
      });

      // Simulate a transport error (timeout / connection reset). The
      // SDK's fetch() rejects and the catch-branch in
      // checkAndBumpRateLimit returns `{ok: false}`.
      await page.route(
        /\.supabase\.co\/rest\/v1\/rpc\/bump_match_rate_limit/,
        async (route: Route) => {
          await route.abort("failed");
        },
      );
    });

    test(
      "rate-limit RPC aborted — route — non-200 surfaced not swallowed",
      async ({ page }) => {
        const res = await page.request.get(
          "http://localhost:3000/api/networking/match-candidates",
        );
        const status = res.status();
        const body = await res.text();

        // Primary bind: transport-level failure must NOT silently
        // return candidates. Any non-200 is acceptable; 200 is the
        // exact bypass R11 Red Team flagged.
        expect(
          status,
          `expected non-200 on aborted rate-limit RPC; got ${status} body=${body}`,
        ).not.toBe(200);

        // Task-spec strict bind: 500 preferred (transport error is an
        // infrastructure fault, not a rate-limit hit).
        // REGRESSION CANDIDATE: same root cause as the RPC-error
        // scenario above — checkAndBumpRateLimit returns `{ok: false}`
        // on thrown fetch and the route funnels it into a 429.
        expect(
          status,
          `task spec asks for 500 on RPC transport error; got ${status} body=${body}`,
        ).toBe(500);
      },
    );
  },
);
