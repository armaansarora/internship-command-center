import { test, expect } from "@playwright/test";
import { installSupabaseMock } from "../helpers/mock-supabase";

/**
 * R12.3 — forged JWT — /api/networking/match-candidates — request is
 * blocked.
 *
 * Architecture (R12.10): defense-in-depth at TWO layers:
 *
 *   1. The proxy/middleware reads cookies via Supabase SSR's session
 *      storage adapter, which keys on `sb-<projectRef>-auth-token`. Any
 *      cookie the attacker plants under a different name (e.g., the
 *      legacy `sb-access-token`) does NOT make it into the parsed
 *      session, so middleware sees user=null and redirects to /lobby.
 *
 *   2. Even if a cookie under the right name carries a forged JWT, the
 *      auth-js client calls /auth/v1/user with the bearer to verify —
 *      our stub server is configured here with `authedUser: null` so
 *      the verification request returns 401, the SDK returns user=null,
 *      and the middleware again redirects.
 *
 * Acceptable shapes for the bound assertion:
 *   - 307 with Location → /lobby (middleware redirect)
 *   - 401 unauthenticated JSON (route-level guard if middleware allowed
 *     the request through)
 * A 200 with candidates would mean the forged JWT was honored — the
 * exact bypass this scenario binds against.
 */
test.describe("forged JWT — /api/networking/match-candidates — request blocked at middleware or route", () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseMock(page, { authedUser: null });
  });

  test("crafted JWT with forged sub but bad signature — request never yields 200", async ({
    page,
    context,
  }) => {
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: "00000000-0000-0000-0000-000000000002",
        exp: 9999999999,
      }),
    ).toString("base64url");
    const craftedJwt = `${header}.${payload}.tampered-signature`;

    await context.addCookies([
      {
        name: "sb-access-token",
        value: craftedJwt,
        url: "http://localhost:3000",
      },
    ]);

    const res = await page.request.get(
      "http://localhost:3000/api/networking/match-candidates",
      { maxRedirects: 0 },
    );

    const status = res.status();
    expect(
      [307, 401],
      `forged JWT must not yield candidate data; got status ${status}`,
    ).toContain(status);

    if (status === 307) {
      expect(res.headers()["location"] ?? "").toContain("/lobby");
    }
  });

  test("cookie present with literal string \"null\" — request never yields 200", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "sb-access-token",
        value: "null",
        url: "http://localhost:3000",
      },
    ]);

    const res = await page.request.get(
      "http://localhost:3000/api/networking/match-candidates",
      { maxRedirects: 0 },
    );

    const status = res.status();
    expect(
      [307, 401],
      `literal "null" cookie must not yield candidate data; got status ${status}`,
    ).toContain(status);

    if (status === 307) {
      expect(res.headers()["location"] ?? "").toContain("/lobby");
    }
  });
});
