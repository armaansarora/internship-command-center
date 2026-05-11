import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { signInAs } from "./helpers/auth";

/**
 * Trust Console — graceful degrade when `TOWER_TRUST_CONSOLE` is unset.
 *
 * Day 1 contract: a user who hits /settings/privacy without the flag on
 * is redirected to /settings instead of seeing a half-built Trust
 * Console. The page never renders the retention banner or the Trust
 * Console panel — the public surface stays a quiet preview until the
 * operator flips the env var.
 *
 * Skipped when the flag IS on, because the page would render and this
 * negative-path assertion would fail.
 */
test.describe("Trust Console — flag-off degrade", () => {
  test("redirects to /settings when the flag is off", async ({ page }) => {
    test.skip(
      Boolean(process.env.TOWER_TRUST_CONSOLE),
      "Trust Console flag is on — page renders instead of redirecting",
    );

    const user = {
      id: randomUUID(),
      email: `flagoff-${randomUUID()}@example.com`,
    };

    await signInAs(page, user, {
      tables: {
        user_profiles: [
          {
            id: user.id,
            email: user.email,
            subscription_tier: "free",
            floors_unlocked: ["L", "PH"],
          },
        ],
      },
      allowWrites: false,
    });

    await page.goto("/settings/privacy");
    await expect(page).toHaveURL(/\/settings($|\?)/, { timeout: 10_000 });
    // Trust Console testid must NOT render on the destination page.
    await expect(
      page.getByTestId("trust-console"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("retention-banner"),
    ).toHaveCount(0);
  });
});
