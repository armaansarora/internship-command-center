import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";

/**
 * R12.4 — consent rapid toggle — /api/networking/{revoke,opt-in} —
 * cascade is honored on every revoke, never silently skipped.
 *
 * Invariant: 50 rapid revoke → opt-in cycles (100 requests total) must
 * complete without data races or silent cascade skips. The R11 revoke
 * cascade is three-step (see src/app/api/networking/revoke/route.ts):
 *   1. Stamp `networking_revoked_at=now()` on user_profiles.
 *   2. DELETE from networking_match_index where user_id=<caller>.
 *   3. DELETE from match_candidate_index where counterparty_anon_key IN
 *      (the HMAC-SHA256 anon-keys derived from caller's contact IDs).
 *
 * Step 3 is the R11 Red Team fix — the binding proof-of-life.  This
 * scenario asserts that across 50 revoke cycles, the mock observed:
 *   - 50 user_profiles UPDATEs (one per revoke),
 *   - 50 DELETEs on networking_match_index (one per revoke, Step 2),
 *   - 50 DELETEs on match_candidate_index (one per revoke, Step 3 cascade),
 *   - 50 user_profiles UPDATEs for the opt-in cycles that follow.
 *
 * A silently-skipped cascade (regression) shows up as
 * `match_candidate_index` DELETE count < 50.
 */

const CYCLE_COUNT = 50;
// One contact row — the cascade derives an anon-key from it and issues
// a `.in('counterparty_anon_key', [<key>])` DELETE. Seeding at least one
// contact ensures Step 3 actually makes a DELETE call (the route
// guards on `contactIds.length > 0`).
const ALICE_CONTACT_ID = "00000000-0000-0000-0000-aaaa00000001";

test.describe(
  "consent rapid toggle — /api/networking/{revoke,opt-in} — revoke cascade honored across 50 cycles",
  () => {
    type TrackedOp = { table: string; method: string };
    let ops: TrackedOp[] = [];

    test.beforeEach(async ({ page }) => {
      ops = [];
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
          contacts: [
            {
              id: ALICE_CONTACT_ID,
              user_id: USERS.alice.id,
            },
          ],
          networking_match_index: [],
          match_candidate_index: [],
        },
        allowWrites: true,
      });

      await page.route(/\.supabase\.co\/rest\/v1\//, async (route: Route) => {
        const request = route.request();
        const method = request.method();
        if (method !== "GET" && method !== "HEAD") {
          const url = new URL(request.url());
          const table = url.pathname
            .substring("/rest/v1/".length)
            .split("?")[0];
          ops.push({ table, method });
        }
        await route.fallback();
      });
    });

    test(
      "50 revoke / opt-in cycles complete and cascade DELETE on match_candidate_index fires on each revoke",
      async ({ page }) => {
        // Drive the cycles serially so we can hard-assert exact counts
        // without flake from concurrent auth cookie contention.
        for (let i = 0; i < CYCLE_COUNT; i++) {
          const revoke = await page.request.post(
            "http://localhost:3000/api/networking/revoke",
          );
          expect(revoke.status()).toBe(200);

          const optIn = await page.request.post(
            "http://localhost:3000/api/networking/opt-in",
          );
          expect(optIn.status()).toBe(200);
        }

        // Count DELETEs against match_candidate_index. The revoke route
        // guards Step 3 on `contactIds.length > 0`; since we seeded one
        // contact, the DELETE fires exactly once per revoke.
        const cascadeDeletes = ops.filter(
          (o) =>
            o.table === "match_candidate_index" && o.method === "DELETE",
        );
        expect(cascadeDeletes.length).toBe(CYCLE_COUNT);

        // Step 2 parity check — networking_match_index DELETE per revoke.
        const step2Deletes = ops.filter(
          (o) =>
            o.table === "networking_match_index" && o.method === "DELETE",
        );
        expect(step2Deletes.length).toBe(CYCLE_COUNT);

        // Step 1 — user_profiles UPDATE count. Each revoke + each opt-in
        // fires one UPDATE, so 2 × CYCLE_COUNT total.
        const profileUpdates = ops.filter(
          (o) => o.table === "user_profiles" && o.method === "PATCH",
        );
        expect(profileUpdates.length).toBe(CYCLE_COUNT * 2);
      },
    );
  },
);
