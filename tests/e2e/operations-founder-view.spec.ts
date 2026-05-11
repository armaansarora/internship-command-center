import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { signInAs } from "./helpers/auth";

/**
 * /operations — founder-only Operations Dashboard.
 *
 * Three layers of defense (see src/app/(authenticated)/operations/page.tsx):
 *   1. unauth → redirect to /lobby (only the entry point should know it
 *      can route an unauth user, so this stays as a redirect).
 *   2. authed non-owner → notFound() / 404. The route never reveals its
 *      existence to anyone but the owner.
 *   3. owner + feature flag off → notFound() / 404. Same reasoning.
 *
 * The owner-success path (all four panels render) is covered server-side
 * in the corresponding page.test.tsx + per-panel component tests. This
 * e2e file exercises the unauth + non-owner branches because they are
 * the load-bearing browser-level guards — a typo'd /operations URL must
 * not surface founder content to anyone, ever.
 */
test.describe("/operations — route guards", () => {
  test("unauthenticated GET redirects to /lobby", async ({ request }) => {
    const res = await request.get("/operations", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
    expect(res.headers()["location"] ?? "").toContain("/lobby");
  });

  test("authenticated non-owner never sees /operations founder content", async ({
    page,
  }) => {
    const nonOwner = {
      id: randomUUID(),
      email: `noop-${randomUUID()}@example.com`,
    };
    await signInAs(page, nonOwner, {
      tables: {
        user_profiles: [
          {
            id: nonOwner.id,
            email: nonOwner.email,
            subscription_tier: "free",
            floors_unlocked: ["L", "PH"],
          },
        ],
      },
    });

    const res = await page.goto("/operations", {
      waitUntil: "domcontentloaded",
    });
    // The page returns 404 via `notFound()` rather than redirect, so the
    // status MAY be 404. The load-bearing assertion is that no founder
    // panel headers appear for a non-owner.
    expect(res?.status() ?? 0).toBeLessThan(500);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/activation funnel/i);
    expect(body).not.toMatch(/cron health/i);
    expect(body).not.toMatch(/lighthouse incidents/i);
    expect(body).not.toMatch(/ai spend today/i);
    expect(body).not.toMatch(/recent activations/i);
  });
});
