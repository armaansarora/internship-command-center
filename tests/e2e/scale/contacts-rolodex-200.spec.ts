import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, loadFixture } from "../helpers/fixtures";

/**
 * R12.6 — Scale scenario: 200 contacts in the Rolodex Lounge.
 *
 * Invariants (HARSH — do NOT weaken):
 *   1. The 3D cylinder element (`.rolodex-cylinder`) must mount when 200
 *      contacts are loaded. The Rolodex component exists in
 *      src/components/floor-6/rolodex/Rolodex.tsx with virtualization built
 *      in (VISIBLE_ARC_DEG cap), BUT RolodexLoungeClient currently renders
 *      ContactGrid instead. If the cylinder is absent from the DOM, this
 *      scenario SHOULD fail — file blocker R12.6 "rolodex cylinder not
 *      wired into RolodexLoungeClient". Do NOT weaken the selector.
 *   2. Live card count (`[data-rolodex-card="live"]`) stays at ≤ 50 while
 *      scrolling through — matches Rolodex.tsx documented cap. Math at 200
 *      contacts: 360° / 200 = 1.8° per card; VISIBLE_ARC_DEG=90 (strict
 *      |delta|<45°) → ~50 live. Original draft asserted ≤ 30 ("headroom"),
 *      but at this density the implementation IS the cap, not below it.
 *      The bound binds the defense ("virtualize — never render all 200").
 */
test.describe("scale — 200 contacts — 3D cylinder virtualization", () => {
  const CONTACTS_200 = loadFixture<Array<Record<string, unknown>>>(
    "contacts-200.json",
  );

  test.beforeEach(async ({ page }) => {
    await signInAs(page, USERS.alice, {
      tables: {
        contacts: CONTACTS_200,
        user_profiles: [
          {
            id: USERS.alice.id,
            email: USERS.alice.email,
            networking_consent_version: 2,
          },
        ],
        companies: [],
      },
      rpc: {},
    });
  });

  test("200 contacts → rolodex-cylinder element exists in DOM", async ({
    page,
  }) => {
    await page.goto("/rolodex-lounge", { waitUntil: "networkidle" });

    // Wait for the page chrome to mount. The Lounge scene always renders
    // some landmark even while contacts are streaming in via Suspense.
    await page.waitForLoadState("domcontentloaded");

    // The cylinder is the invariant — it either mounts or it doesn't.
    // `.rolodex-cylinder` is defined in Rolodex.tsx as the transform
    // container (perspective: 1200px, transformStyle: preserve-3d).
    const cylinder = page.locator(".rolodex-cylinder");
    await expect(
      cylinder,
      "Expected .rolodex-cylinder to mount when 200 contacts are loaded. " +
        "If absent, RolodexLoungeClient isn't wiring the Rolodex component in.",
    ).toHaveCount(1, { timeout: 5_000 });
  });

  test("scrolling cycles cards → ≤ 50 live cards rendered at once", async ({
    page,
  }) => {
    await page.goto("/rolodex-lounge", { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");

    // Must find the cylinder first — if this times out the prior test will
    // already have failed. Repeat the wait so this test fails independently.
    await page
      .locator(".rolodex-cylinder")
      .waitFor({ state: "attached", timeout: 5_000 });

    // Drive the cylinder with wheel events. Rolodex.tsx uses onWheel to
    // rotate — a series of synthetic wheels walks the virtualization window.
    const container = page.locator('[role="region"][aria-roledescription="rotating rolodex"]');
    await container.hover().catch(() => {
      // If the rolodex region isn't present (only cylinder), fall back to
      // dispatching wheel on the page body — the invariant is the live-card
      // count, not the input mechanism.
    });

    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(50);
    }

    const liveCardCount = await page
      .locator('[data-rolodex-card="live"]')
      .count();

    expect(
      liveCardCount,
      `Expected ≤ 50 live cards after scrolling, got ${liveCardCount}. ` +
        `Rolodex virtualizer caps the arc at ≤ 50 (VISIBLE_ARC_DEG=90, strict ` +
        `|delta|<45°, 200 contacts × 1.8° each). The cap IS the spec — anything ` +
        `above 50 means virtualization regressed.`,
    ).toBeLessThanOrEqual(50);

    // Counterpart sanity — at least SOME cards should be live. If zero, the
    // fixture data didn't make it through or the cylinder rendered empty.
    expect(
      liveCardCount,
      "Expected at least 1 live card when 200 contacts are in the data layer.",
    ).toBeGreaterThan(0);
  });
});
