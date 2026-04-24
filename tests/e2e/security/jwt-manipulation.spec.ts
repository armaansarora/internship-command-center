import { test, expect } from "@playwright/test";
import { installSupabaseMock } from "../helpers/mock-supabase";

/**
 * R12.3 — forged JWT — /api/networking/match-candidates — server returns 401.
 *
 * Supabase's server-side session parser ignores signature-less / malformed
 * JWTs; the route's `sb.auth.getUser()` call fails, falling through to the
 * 401 `unauthenticated` branch. Even if an attacker crafts a header + payload
 * with a victim's `sub`, the upstream /auth/v1/user call (mocked here to
 * reject) is the source of truth.
 */
test.describe("forged JWT — /api/networking/match-candidates — server returns 401", () => {
  test.beforeEach(async ({ page }) => {
    // Mock surface rejects auth — any crafted cookie the attacker sends
    // ultimately has to pass through the /auth/v1/user gate.
    await installSupabaseMock(page, { authedUser: null });
  });

  test("crafted JWT with forged sub but bad signature yields 401", async ({
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
    );
    expect(res.status()).toBe(401);
  });

  test("cookie present with literal string \"null\" yields 401", async ({
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
    );
    expect(res.status()).toBe(401);
  });
});
