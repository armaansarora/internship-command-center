import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES, loadFixture } from "../helpers/fixtures";
import { assertNoneAppear } from "../helpers/assertions";

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
const bobCandidates = loadFixture<MatchCandidateRow[]>(
  "match-candidates/bob.json",
);

/**
 * R12.8 carryover — R11 cross-user RLS runtime proof.
 *
 * R11.11 Red Team debt: the structural `.eq("user_id", user.id)` grep is
 * bound by src/app/__tests__/r11-cross-user-rls.proof.test.ts, but under
 * jsdom we could never bind the runtime behavior end-to-end — "does the
 * route actually filter Bob's rows out when the DB hands back both sets?"
 *
 * Strategy (R12.10): the stub-server `table_filter_branch` override on
 * `match_candidate_index` simulates DB-side RLS:
 *
 *   (A) If the GET URL contains `user_id=eq.<alice>` — the route IS scoping
 *       by user_id, so RLS is respected. Stub returns ONLY Alice's rows.
 *   (B) If NO user_id filter (or wrong filter) — the route SKIPPED scoping,
 *       which is the exact cross-user leak this proof is binding. Stub
 *       returns the UNION of Alice's + Bob's rows so the leaking payload
 *       carries Bob's anon-keys into the response.
 *
 * If the server correctly applies `.eq("user_id", user.id)` the response
 * body contains only A-ANON-* keys → test passes.
 *
 * If the server omits that filter (or accepts a forged filter), Bob's
 * anon-keys and id appear in the response body → `assertNoneAppear` fails
 * and this scenario is a REAL privacy regression. Per the phase brief,
 * the failing assertion STAYS — the main thread files
 * `tower block R12.8 "cross-user leak: ..."` on surface.
 */

test.describe(
  "cross-user RLS — Alice's match-candidates — response never contains Bob's anon-keys",
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
          // match_candidate_index branch behavior is owned by the
          // table_filter_branch override below.
          match_candidate_index: [],
        },
        rpc: {
          bump_match_rate_limit: { allowed: true, count: 1 },
        },
        allowWrites: true,
        overrides: [
          {
            behavior: "table_filter_branch",
            table: "match_candidate_index",
            filterParam: "user_id",
            filterValue: `eq.${USERS.alice.id}`,
            onMatch: aliceCandidates,
            onNoMatch: [...aliceCandidates, ...bobCandidates],
          },
        ],
      });
    });

    test(
      "cross-user RLS — Alice's match-candidates — response never contains Bob's anon-keys",
      async ({ page }) => {
        const res = await page.request.get(
          "http://localhost:3000/api/networking/match-candidates",
        );

        const body = await res.text();
        const leakCheck = assertNoneAppear(body, [
          "B-ANON-001",
          "B-ANON-002",
          "B-ANON-003",
          "B-ANON-004",
          "B-ANON-005",
          USERS.bob.id,
        ]);

        // If this fails, the route did not carry the `.eq("user_id",
        // user.id)` filter into the Supabase SELECT and Bob's precomputed
        // match rows leaked into Alice's response payload.
        // REGRESSION CANDIDATE: Supabase SELECT on match_candidate_index
        // returned a cross-user union because the user_id filter was
        // absent from the URL — check route.ts for a missing .eq or a
        // rebuilt query that drops the scope.
        expect(
          leakCheck.ok,
          `cross-user RLS leak: Alice saw Bob's row marker "${
            leakCheck.ok ? "" : leakCheck.found
          }" in response body: ${body.slice(0, 400)}`,
        ).toBe(true);
      },
    );

    test(
      "cross-user RLS — positive control — Alice sees her own A-ANON-* rows",
      async ({ page }) => {
        // Sanity check: if the table_filter_branch override ever stops
        // serving Alice's rows on the correctly-scoped path, the primary
        // leak assertion becomes vacuously safe. This test ensures the
        // happy path carries Alice's data end-to-end so the primary test
        // can meaningfully fail on a real regression.
        const res = await page.request.get(
          "http://localhost:3000/api/networking/match-candidates",
        );
        const body = await res.text();
        expect(body).toContain("A-ANON-001");
      },
    );
  },
);
