import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";

/**
 * R12.4 — match-candidates flood — /api/networking/match-candidates —
 * rate-limit trips at 21, returns typed 429.
 *
 * Invariant (R11.7): LIMIT = 20 per hour per user (src/lib/networking/
 * rate-limit.ts). Requests 1–20 MUST return 200; request 21 MUST return
 * 429 with a body that indicates rate-limiting.
 *
 * The route calls the `bump_match_rate_limit` Postgres RPC atomically —
 * see src/lib/networking/rate-limit.ts. The RPC returns
 * `{allowed: boolean, count: number}`. We mock it statefully via the
 * stub-server `rpc_count_threshold` override: calls 1–20 return
 * `{allowed: true, count: N}`; call 21 returns `{allowed: false, count: 21}`.
 *
 * R12.10 — migrated from page.route() closure overlay to stub-server
 * override. Stateful counter now lives at :3001 and is reset on each
 * scenario install.
 */

const LIMIT = 20;
const TOTAL_REQUESTS = 21;

test.describe(
  "match-candidates flood — /api/networking/match-candidates — 21st request returns 429",
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
          match_candidate_index: [],
          match_events: [],
        },
        allowWrites: true,
        overrides: [
          {
            behavior: "rpc_count_threshold",
            rpc: "bump_match_rate_limit",
            limit: LIMIT,
            allowed: { allowed: true },
            blocked: { allowed: false },
          },
        ],
      });
    });

    test(
      "sequential requests 1–20 return 200 and request 21 returns 429 with rate-limit body",
      async ({ page }) => {
        const statuses: number[] = [];
        const bodies: string[] = [];
        for (let i = 0; i < TOTAL_REQUESTS; i++) {
          const res = await page.request.get(
            "http://localhost:3000/api/networking/match-candidates",
          );
          statuses.push(res.status());
          bodies.push(await res.text());
        }

        for (let i = 0; i < LIMIT; i++) {
          expect(statuses[i]).toBe(200);
        }

        expect(statuses[LIMIT]).toBe(429);
        const body21 = bodies[LIMIT].toLowerCase();
        // Body should indicate rate-limiting. The route returns
        // `{ok: false, reason: "rate-limited", retry_after_seconds}`.
        expect(body21).toMatch(/rate|limit/);
      },
    );
  },
);
