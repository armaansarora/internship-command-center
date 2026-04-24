import { test, expect } from "@playwright/test";
import { installSupabaseMock } from "../helpers/mock-supabase";

/**
 * R12.3 — anonymous RLS-escape — /api/networking/match-candidates —
 * server returns 401.
 *
 * The invariant: an unauthenticated caller must hit the explicit auth
 * check at the top of the route (`reason: "unauthenticated"`) and NOT
 * fall through to either a 500 (crash) or a 200 with an empty candidates
 * array (silent RLS leak masked as empty result).
 */
test.describe("anonymous request — /api/networking/match-candidates — server returns 401", () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMock(page, { authedUser: null });
  });

  test("no auth cookies at all returns 401, not 500 and not 200 empty", async ({
    page,
  }) => {
    const res = await page.request.get(
      "http://localhost:3000/api/networking/match-candidates",
    );
    expect(res.status()).toBe(401);
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ ok: false, reason: "unauthenticated" });
  });
});
