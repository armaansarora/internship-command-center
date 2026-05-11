import { test, expect } from "@playwright/test";

/**
 * Off-platform synthetic canary — production liveness probe.
 *
 * Runs every 15 minutes from GitHub Actions (.github/workflows/canary.yml),
 * NOT Vercel Cron. The whole point is that the scheduler survives a Vercel
 * region outage; if we tried to detect Vercel being down using Vercel,
 * we'd never see the alert.
 *
 * Hits THREE production surfaces and asserts each is alive:
 *
 *   1. Root (`/`) — redirects to /lobby or /penthouse; the response chain
 *      must reach a page that contains the brand string "The Tower".
 *   2. Heartbeat probe (`/api/cron/canary-heartbeat`) — the dedicated
 *      public liveness JSON endpoint (deliberately unauthenticated, see
 *      src/app/api/cron/canary-heartbeat/route.ts). Must answer 200 with
 *      `{ ok: true, t: <unix-seconds>, build: <string> }`.
 *   3. Lobby (`/lobby`) — must render the Google sign-in CTA. We don't
 *      attempt OAuth (no service account); we just verify the auth
 *      surface itself renders.
 *
 * Any failure here = GitHub Actions job fails = repo admins get an email
 * via GitHub's built-in failure notifications. That's the entire alert
 * mechanism. No PagerDuty wiring, no Slack webhook — keep it boring.
 *
 * Lives outside tests/e2e/ so it is NOT picked up by the regular e2e
 * playwright.config.ts (which boots the stub Supabase server and points
 * at localhost). This canary hits real production via
 * playwright.canary.config.ts.
 */

const BRAND = "The Tower";
const PRODUCTION_URL =
  process.env.CANARY_BASE_URL ?? "https://www.interntower.com";

test.describe("production canary @ " + PRODUCTION_URL, () => {
  test.describe.configure({ retries: 1, timeout: 30_000 });

  test("root URL responds and serves the brand string", async ({ page }) => {
    // The root page redirects to /lobby for unauthenticated visitors —
    // we follow redirects and assert on the final rendered HTML. The
    // brand string must appear somewhere in the body so we know the
    // app shell actually rendered, not just a CDN edge error page.
    const response = await page.goto(PRODUCTION_URL, {
      waitUntil: "domcontentloaded",
    });
    expect(response, "no response from production root").not.toBeNull();
    expect(response!.status(), "root URL status").toBeLessThan(400);
    const html = await page.content();
    expect(html, "brand string missing — app shell did not render").toContain(
      BRAND,
    );
  });

  test("heartbeat probe answers 200 with { ok: true, t, build }", async ({
    request,
  }) => {
    const res = await request.get(`${PRODUCTION_URL}/api/cron/canary-heartbeat`);
    expect(res.status(), "heartbeat status").toBe(200);
    const body = (await res.json()) as {
      ok?: unknown;
      t?: unknown;
      build?: unknown;
    };
    expect(body.ok, "heartbeat.ok must be true").toBe(true);
    expect(typeof body.t, "heartbeat.t must be a unix timestamp").toBe(
      "number",
    );
    expect(typeof body.build, "heartbeat.build must be a string").toBe(
      "string",
    );

    // Sanity-check the timestamp is fresh — within 5 minutes of now.
    // A drift larger than this means the function is serving cached
    // bytes from somewhere (CDN, edge cache) instead of executing,
    // which defeats the purpose of a liveness probe.
    const nowSec = Math.floor(Date.now() / 1000);
    const drift = Math.abs((body.t as number) - nowSec);
    expect(drift, "heartbeat timestamp is stale (cached?)").toBeLessThan(300);
  });

  test("lobby renders the Google sign-in CTA", async ({ page }) => {
    const response = await page.goto(`${PRODUCTION_URL}/lobby`, {
      waitUntil: "domcontentloaded",
    });
    expect(response, "no response from /lobby").not.toBeNull();
    expect(response!.status(), "lobby status").toBeLessThan(400);

    // The lobby renders a "Continue with Google" CTA for unauthenticated
    // visitors. We don't click it (no service account), but the presence
    // of the button proves the auth surface mounted. We use a permissive
    // matcher because the exact copy may shift between marketing pushes —
    // what matters is that *some* Google sign-in affordance is on screen.
    const googleCta = page
      .getByRole("button", { name: /google/i })
      .or(page.getByRole("link", { name: /google/i }))
      .or(page.getByLabel(/google/i))
      .first();
    await expect(
      googleCta,
      "no Google sign-in CTA found on /lobby — auth surface broken",
    ).toBeVisible({ timeout: 10_000 });
  });
});
