import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";

/**
 * R12.3 — stale consent version — /api/networking/match-candidates —
 * server returns 403 consent-version-stale.
 *
 * R11 bumped CURRENT_CONSENT_VERSION from 1 → 2. Any user with a stored
 * `networking_consent_version = 1` is treated as having read an older
 * copy of the consent notice and must re-consent. The guard fail-closes
 * — the route never reads match_candidate_index for stale users.
 */
test.describe("stale consent version — /api/networking/match-candidates — server returns 403 consent-version-stale", () => {
  test.beforeEach(async ({ page }) => {
    // Authed user whose user_profiles row has consent-version=1 (stale).
    await signInAs(page, USERS.alice, {
      tables: {
        user_profiles: [
          {
            id: USERS.alice.id,
            networking_consent_at: TIMES.anchor,
            networking_revoked_at: null,
            networking_consent_version: 1,
          },
        ],
      },
    });
  });

  test("GET with stale consent-version returns 403 and consent-version-stale code", async ({
    page,
  }) => {
    const res = await page.request.get(
      "http://localhost:3000/api/networking/match-candidates",
    );
    expect(res.status()).toBe(403);

    const bodyText = await res.text();
    expect(bodyText).toContain("consent-version-stale");
  });
});
