import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { signInAs } from "./helpers/auth";
import { TIMES } from "./helpers/fixtures";

/**
 * Trust Console — data export request → poll → download flow.
 *
 * Binds the user-facing contract for the export request lifecycle as it
 * lives in `/settings/privacy`:
 *
 *   1. Click "Request export" — the server action queues a row.
 *   2. The UI starts polling `/api/account/export/status` every few
 *      seconds (in this test, intercepted to return `queued` then
 *      `delivered`).
 *   3. On `delivered`, the page reveals a "Download archive" anchor
 *      pointing at the signed URL from the status response.
 *
 * The status route is mocked at the network boundary because the live
 * implementation reads Supabase Storage, which the e2e stub does not
 * model. Bookmarked transitions (queued → delivered) are deterministic.
 *
 * Skipped unless the TOWER_TRUST_CONSOLE flag is set; the page redirects
 * to /settings without it and the spec would never see the export
 * affordance.
 */
test.describe("Trust Console — data export request flow", () => {
  test("queue → poll status → render download link", async ({ page }) => {
    test.skip(
      !process.env.TOWER_TRUST_CONSOLE,
      "Trust Console flag is off — page redirects to /settings",
    );

    const user = {
      id: randomUUID(),
      email: `export-flow-${randomUUID()}@example.com`,
    };

    await signInAs(page, user, {
      tables: {
        user_profiles: [
          {
            id: user.id,
            email: user.email,
            networking_consent_at: TIMES.anchor,
            networking_revoked_at: null,
            networking_consent_version: 2,
            subscription_tier: "free",
            floors_unlocked: ["L", "PH", "6"],
          },
        ],
        contacts: [],
        networking_match_index: [],
        match_candidate_index: [],
        audit_logs: [],
      },
      allowWrites: true,
    });

    // Intercept the status endpoint. The first call (mount-time) reports
    // idle so the page renders with the "Request export" button enabled;
    // subsequent calls (after the click) hand back queued, then
    // delivered with a fake signed URL.
    const SIGNED_URL = `https://stub.example.com/export-${user.id}.zip?token=t`;
    let exportStatusCallCount = 0;
    await page.route("**/api/account/export/status", async (route) => {
      exportStatusCallCount += 1;
      if (exportStatusCallCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "idle",
            requestedAtIso: null,
            deliveredAtIso: null,
            downloadUrl: null,
            downloadExpiresAtIso: null,
          }),
        });
      } else if (exportStatusCallCount === 2) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "queued",
            requestedAtIso: new Date().toISOString(),
            deliveredAtIso: null,
            downloadUrl: null,
            downloadExpiresAtIso: null,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "delivered",
            requestedAtIso: new Date().toISOString(),
            deliveredAtIso: new Date().toISOString(),
            downloadUrl: SIGNED_URL,
            downloadExpiresAtIso: new Date(
              Date.now() + 3600 * 1000,
            ).toISOString(),
          }),
        });
      }
    });

    await page.goto("/settings/privacy");

    const exportButton = page.getByTestId("export-button");
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // The polling cadence is 4 seconds; wait up to 30s for delivery.
    const downloadLink = page.getByTestId("export-download-link");
    await expect(downloadLink).toBeVisible({ timeout: 30_000 });
    await expect(downloadLink).toHaveAttribute("href", SIGNED_URL);

    // The export-status endpoint was hit at least three times:
    // mount + at least one poll + delivered poll.
    expect(exportStatusCallCount).toBeGreaterThanOrEqual(3);
  });
});
