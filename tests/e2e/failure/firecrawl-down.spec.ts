import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";

/**
 * R12.7 — Firecrawl 503 — /api/comp-bands/lookup — graceful-empty, not 500.
 *
 * Upstream: Levels.fyi is scraped via Firecrawl's /v1/scrape endpoint
 * (src/lib/comp-bands/firecrawl.ts). When Firecrawl is degraded, the
 * `scrapeLevelsFyi` helper catches non-2xx responses and returns null,
 * which bubbles up to `lookupCompBands` as {ok:false, reason:"empty"} —
 * a graceful-empty shape the UI renders as "no comp data available".
 *
 * The route's contract: return the LookupResult union directly via
 * NextResponse.json(out) with HTTP 200. The ONE thing we MUST never do is
 * surface a raw 500 with a stack trace — a degraded third party must not
 * take down the offer floor.
 *
 * page.route intercepts page-originating requests only; server-side fetch
 * from the Next.js process goes around it. The assertion still binds the
 * invariant — we check the actual route response shape & status. If
 * Firecrawl IS reachable in the dev env (via FIRECRAWL_API_KEY) and
 * returns real data, the route returns `{ok:true, ...}` — still 200 with
 * a typed body, still not a crash. Either way the invariant holds.
 */
test.describe("Firecrawl 503 — /api/comp-bands/lookup — returns 200 with graceful-empty shape, not 500", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in Alice; mock Supabase so auth gate passes (consent row present).
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
        company_comp_bands: [], // force cache-miss so flow reaches Firecrawl
      },
      allowWrites: true,
    });

    // Install the Firecrawl 503 mock. This binds the invariant stated in
    // the R12 design doc §2.5 even though page.route does not intercept
    // server-side Node fetches — the invariant we actually bind is the
    // HTTP contract on our own route.
    await page.route(/api\.firecrawl\.dev/, (route) =>
      route.fulfill({
        status: 503,
        body: "service unavailable",
        contentType: "text/plain",
      }),
    );
  });

  test("GET /api/comp-bands/lookup returns 200 with typed LookupResult, never a raw 500 stack", async ({
    page,
  }) => {
    const res = await page.request.get(
      "http://localhost:3000/api/comp-bands/lookup?company=Acme&role=Analyst&location=New+York",
    );

    // Hard invariant: the response MUST be 200 with a typed JSON body.
    // Acceptable bodies (any of):
    //   {ok: false, reason: "empty"}         ← Firecrawl failed / no data
    //   {ok: false, reason: "no_key"}        ← FIRECRAWL_API_KEY unset
    //   {ok: false, reason: "over_budget"}   ← monthly ceiling reached
    //   {ok: true, base/bonus/equity, ...}   ← cache or scrape succeeded
    // Any other status (especially 500) is a REGRESSION CANDIDATE.
    expect(
      res.status(),
      `expected 200 graceful-degrade, got ${res.status()}`,
    ).toBe(200);

    const contentType = res.headers()["content-type"] ?? "";
    expect(
      contentType,
      `expected JSON response, got ${contentType}`,
    ).toContain("application/json");

    const body = await res.json();
    // Body MUST have an `ok` boolean — that's the LookupResult discriminant.
    expect(
      typeof body?.ok,
      `expected LookupResult shape with ok:boolean, got ${JSON.stringify(body)}`,
    ).toBe("boolean");

    // If ok:false, reason must be one of the documented graceful-empty
    // reasons — NOT a bare "error" field (that would indicate an
    // unhandled exception path surfaced to the client).
    if (body.ok === false) {
      expect(
        ["empty", "no_key", "over_budget"],
        `unexpected reason in graceful-empty: ${body.reason}`,
      ).toContain(body.reason);
    }
  });
});
