import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";
import { assertNoneAppear } from "../helpers/assertions";

/**
 * R12.3 — cross-user match leak — /api/networking/match-candidates —
 * Alice's response bytewise contains zero of Bob's anon-keys.
 *
 * R11 invariant: the route's `.eq("user_id", user.id)` filter plus RLS
 * ensures a signed-in user sees only their own match_candidate_index
 * rows, never another user's counterparty_anon_key values. Mock returns
 * both Alice-owned (A-*) and Bob-owned (B-*) rows at the fixture layer —
 * the real route MUST filter Bob's out.
 *
 * If a "B-" anon-key appears in Alice's response, the route is NOT
 * filtering — that's a real cross-user leak regression candidate.
 */
test.describe("cross-user match leak — /api/networking/match-candidates — Alice response excludes Bob rows", () => {
  const FUTURE_INVALIDATES = "2099-01-01T00:00:00Z";

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
        // Mock returns BOTH users' rows — we are asserting the server-side
        // filter. The mock does not enforce user_id filtering; the server
        // route's .eq("user_id", alice.id) is what matters. If the route
        // skips that filter, all 6 rows come back and the test fails.
        match_candidate_index: [
          {
            user_id: USERS.alice.id,
            counterparty_anon_key: "A-ANON-001",
            company_context: "Acme",
            edge_strength: 0.9,
            invalidates_at: FUTURE_INVALIDATES,
          },
          {
            user_id: USERS.alice.id,
            counterparty_anon_key: "A-ANON-002",
            company_context: "Acme",
            edge_strength: 0.8,
            invalidates_at: FUTURE_INVALIDATES,
          },
          {
            user_id: USERS.alice.id,
            counterparty_anon_key: "A-ANON-003",
            company_context: "Acme",
            edge_strength: 0.7,
            invalidates_at: FUTURE_INVALIDATES,
          },
          {
            user_id: USERS.bob.id,
            counterparty_anon_key: "B-ANON-001",
            company_context: "Umbrella",
            edge_strength: 0.95,
            invalidates_at: FUTURE_INVALIDATES,
          },
          {
            user_id: USERS.bob.id,
            counterparty_anon_key: "B-ANON-002",
            company_context: "Umbrella",
            edge_strength: 0.85,
            invalidates_at: FUTURE_INVALIDATES,
          },
          {
            user_id: USERS.bob.id,
            counterparty_anon_key: "B-ANON-003",
            company_context: "Umbrella",
            edge_strength: 0.75,
            invalidates_at: FUTURE_INVALIDATES,
          },
        ],
      },
      rpc: {
        bump_match_rate_limit: { count: 1, remaining: 19 },
      },
      allowWrites: true,
    });
  });

  test("Alice's response bytewise contains zero B-ANON keys or bob id — REGRESSION CANDIDATE if this fails", async ({
    page,
  }) => {
    const res = await page.request.get(
      "http://localhost:3000/api/networking/match-candidates",
    );

    // If auth/consent/rate-limit all pass we expect 200. If the route
    // blocks for another reason (e.g. 500 audit insert), the cross-user
    // leak assertion is vacuously safe — but we still bind the leak
    // assertion on the body text regardless, because a 500 body could in
    // principle leak.
    const body = await res.text();
    const result = assertNoneAppear(body, [
      "B-ANON-001",
      "B-ANON-002",
      "B-ANON-003",
      USERS.bob.id,
    ]);
    expect(result.ok, `cross-user leak detected: ${JSON.stringify(result)}`).toBe(true);
  });
});
