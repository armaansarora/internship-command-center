import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { signInAs } from "./helpers/auth";

/**
 * /operations — founder-only route guard.
 *
 * Three layers of defense (see src/app/(authenticated)/operations/page.tsx):
 *   1. unauth → /lobby
 *   2. authed non-owner → /penthouse
 *   3. owner + feature flag off → /penthouse
 *
 * We exercise the unauth + non-owner branches. The owner-success path is
 * covered server-side in the corresponding page.test.tsx.
 */
test.describe("/operations — route guards", () => {
  test("unauthenticated GET redirects to /lobby", async ({ request }) => {
    const res = await request.get("/operations", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
    expect(res.headers()["location"] ?? "").toContain("/lobby");
  });

  test("authenticated non-owner is bounced away from /operations", async ({ page }) => {
    const nonOwner = { id: randomUUID(), email: `noop-${randomUUID()}@example.com` };
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

    const res = await page.goto("/operations", { waitUntil: "domcontentloaded" });
    expect(res?.status() ?? 0).toBeLessThan(400);
    expect(page.url()).not.toContain("/operations");
    const body = await page.locator("body").innerText();
    // Must not leak founder-only Activation Funnel copy.
    expect(body).not.toMatch(/activation funnel/i);
  });
});
