import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { signInAs } from "./helpers/auth";
import { TIMES } from "./helpers/fixtures";

/**
 * Offer arrival → Negotiation Parlor journey.
 *
 * The parlor's prime directive (see parlor/page.tsx):
 *   - Zero offers → redirect to /c-suite. "No empty Parlor."
 *   - At least one offer → render the Parlor scene.
 */
test.describe("Offer arrival → Parlor", () => {
  test("zero offers redirect away from /parlor", async ({ page }) => {
    const user = { id: randomUUID(), email: `parlor-empty-${randomUUID()}@example.com` };
    await signInAs(page, user, {
      tables: {
        user_profiles: [
          {
            id: user.id,
            email: user.email,
            subscription_tier: "free",
            floors_unlocked: ["L", "PH", "1"],
          },
        ],
        offers: [],
      },
    });

    const res = await page.goto("/parlor", { waitUntil: "domcontentloaded" });
    expect(res?.status() ?? 0).toBeLessThan(400);
    expect(page.url()).not.toMatch(/\/parlor(\/|$|\?)/);
  });

  test("user with one offer sees the Parlor scene", async ({ page }) => {
    const user = { id: randomUUID(), email: `parlor-real-${randomUUID()}@example.com` };
    const offerId = randomUUID();
    const companyId = randomUUID();

    await signInAs(page, user, {
      tables: {
        user_profiles: [
          {
            id: user.id,
            email: user.email,
            subscription_tier: "free",
            floors_unlocked: ["L", "PH", "1"],
            preferences: {
              ceoVoice: { enabled: false },
              parlorCfoQuip: { shown: true },
            },
          },
        ],
        offers: [
          {
            id: offerId,
            user_id: user.id,
            company_id: companyId,
            company_name: "Acme",
            role: "Software Engineer Intern",
            location: "San Francisco",
            level: "intern",
            base: 8500,
            currency: "USD",
            cash: 0,
            equity: 0,
            sign_on: 0,
            status: "received",
            received_at: TIMES.anchor,
            created_at: TIMES.anchor,
            updated_at: TIMES.anchor,
          },
        ],
        contacts: [],
      },
    });

    const res = await page.goto("/parlor", { waitUntil: "domcontentloaded" });
    expect(res?.status() ?? 0).toBeLessThan(400);
    expect(page.url()).toMatch(/\/parlor(\/|$|\?)/);
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Parlor|Negotiation|Offer/i);
    expect(body).toMatch(/Acme|Software Engineer/i);
  });
});
