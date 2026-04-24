import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, loadFixture } from "../helpers/fixtures";

/**
 * R12.6 — Scale scenario: 100 offers in the Negotiation Parlor.
 *
 * Invariants (HARSH — do NOT weaken):
 *   1. The comp-band chart (SVG with class `.parlor-chart`) renders — the
 *      Parlor always threads bands through whether or not a lookup
 *      succeeded; the chart's empty-state is a separate class (`.parlor-
 *      chart-empty`). Either mounts; neither absent.
 *   2. The Oak Table's folder stack does NOT render all 100 offers as
 *      visible folders — the stack-of-folders illusion relies on a cap so
 *      the parlor doesn't drown in folders. A common anti-pattern is to
 *      render every offer; if that happens, this scenario fails and surfaces
 *      a blocker for OakTable to add a stack cap + "view all" drawer.
 *   3. Some accounting surface MUST reflect all 100 offers — either an
 *      ARIA-labelled count ("100 offers") or the listitem count on
 *      `.parlor-oak-table [role="listitem"]`. We accept the listitem count
 *      as the source of truth and assert it equals 100 (ARIA tree truth,
 *      even if visual-only stack is capped).
 */
test.describe("scale — 100 offers — chart + stack cap + full accounting", () => {
  const OFFERS_100 = loadFixture<Array<Record<string, unknown>>>(
    "offers-100.json",
  );

  test.beforeEach(async ({ page }) => {
    await signInAs(page, USERS.alice, {
      tables: {
        offers: OFFERS_100,
        user_profiles: [
          {
            id: USERS.alice.id,
            email: USERS.alice.email,
            networking_consent_version: 2,
            preferences: null,
          },
        ],
        contacts: [],
        companies: [],
      },
      rpc: {},
    });
  });

  test("100 offers → comp-band chart renders (chart OR empty-state)", async ({
    page,
  }) => {
    await page.goto("/parlor", { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");

    // Either the SVG chart or its graceful-empty twin is considered a pass.
    // Both prove CompBandChart mounted; an absent element means the Parlor
    // didn't render its chartSlot at all, which is a real regression.
    const chart = page.locator(".parlor-chart");
    const chartEmpty = page.locator(".parlor-chart-empty");
    const chartVisible = await chart.count();
    const emptyVisible = await chartEmpty.count();

    expect(
      chartVisible + emptyVisible,
      "Expected .parlor-chart or .parlor-chart-empty to mount — neither found. " +
        "CompBandChart slot isn't rendering when offers are present.",
    ).toBeGreaterThanOrEqual(1);
  });

  test("100 offers → visible folder stack capped at ~5", async ({ page }) => {
    await page.goto("/parlor", { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");

    // Let the scene settle so transform-based folders have their final
    // positions — the tilt animation is fast but not instant.
    await page.waitForTimeout(300);

    // Count only folders that are visually on-screen. Playwright's bounding-
    // box filter skips elements clipped out of viewport. A properly-capped
    // stack shows ≤ 5 folders despite 100 in the data.
    const allFolders = page.locator(".parlor-offer-folder-item");
    await allFolders
      .first()
      .waitFor({ state: "attached", timeout: 5_000 });

    const total = await allFolders.count();
    let visibleCount = 0;
    for (let i = 0; i < total; i++) {
      const bb = await allFolders.nth(i).boundingBox();
      if (bb && bb.width > 0 && bb.height > 0) {
        visibleCount++;
      }
    }

    expect(
      visibleCount,
      `Expected ≤ 5 folders visible in the stack, got ${visibleCount}. ` +
        `OakTable should cap the visual stack even when 100 offers are in ` +
        `the data. (DOM may legitimately hold all 100 for a11y.)`,
    ).toBeLessThanOrEqual(5);
  });

  test("100 offers → listitem accounting equals 100", async ({ page }) => {
    await page.goto("/parlor", { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");

    await page
      .locator(".parlor-oak-table")
      .waitFor({ state: "attached", timeout: 5_000 });

    const listitems = await page
      .locator('.parlor-oak-table [role="listitem"]')
      .count();

    expect(
      listitems,
      `Expected ARIA tree to account for all 100 offers, got ${listitems}. ` +
        `Every offer must be a listitem even if the visual stack is capped.`,
    ).toBe(100);
  });
});
