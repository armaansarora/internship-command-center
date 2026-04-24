import { test, expect } from "@playwright/test";
import { installSupabaseMock } from "../helpers/mock-supabase";

/**
 * R12.3 — anonymous RLS-escape — /api/networking/match-candidates —
 * unauthenticated callers are blocked from candidate data.
 *
 * Architecture (R12.10): the security invariant is enforced at the
 * proxy/middleware layer. `/api/networking/match-candidates` is NOT in
 * the publicPaths allowlist (src/lib/supabase/middleware.ts), so an
 * unauthenticated request is rewritten to `/lobby` (307) before the route
 * handler runs. The route's own `requireUserApi() → 401` is a
 * defense-in-depth fallback, but on the HTTP wire path the redirect
 * fires first.
 *
 * We bind the actual security guarantee: an unauthenticated GET to
 * /api/networking/match-candidates MUST NOT yield a 200 with candidate
 * data. Acceptable shapes are:
 *   - 307 with Location → /lobby (middleware redirect)
 *   - 401 unauthenticated JSON (route-level guard if middleware ever
 *     allowed the request through)
 * A 200 with candidates would be the leak this scenario binds against.
 */
test.describe("anonymous request — /api/networking/match-candidates — middleware blocks unauthenticated reads", () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMock(page, { authedUser: null });
  });

  test("no auth cookies at all — request is redirected (307→/lobby) or rejected (401), never 200", async ({
    page,
  }) => {
    const res = await page.request.get(
      "http://localhost:3000/api/networking/match-candidates",
      { maxRedirects: 0 },
    );

    const status = res.status();
    expect(
      [307, 401],
      `expected 307 redirect or 401; got ${status}`,
    ).toContain(status);

    if (status === 307) {
      const location = res.headers()["location"] ?? "";
      expect(location).toContain("/lobby");
    } else {
      const body = await res.json();
      expect(body).toMatchObject({ ok: false, reason: "unauthenticated" });
    }
  });
});
