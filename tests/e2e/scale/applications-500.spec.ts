import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, loadFixture } from "../helpers/fixtures";

/**
 * R12.6 — Scale scenario: 500 applications.
 *
 * Invariants (HARSH — do NOT weaken):
 *   1. With 500 rows in the data layer, the War Room must virtualize —
 *      live DOM listitem count ≤ 50 at any moment. If the current
 *      implementation renders every card (PipelineColumn has no
 *      virtualization), this assertion SHOULD fail and the failure is a
 *      real regression to surface via `tower block R12.6 "no virtualization
 *      in war-table"`.
 *   2. Across 5 reloads, JS heap growth must stay below 20% — detects leaks
 *      from GSAP listeners, dnd-kit sensors, or memo keys that don't release.
 *
 * Selector contract:
 *   - Applications are rendered inside PipelineColumn as role="list" → each
 *     card is wrapped in a `role="listitem"` div. Counting listitems inside
 *     the War Table region is the cheapest stable way to measure live rows.
 */
test.describe("scale — 500 applications — virtualization + no memory leak", () => {
  const APPLICATIONS_500 = loadFixture<Array<Record<string, unknown>>>(
    "applications-500.json",
  );

  test.beforeEach(async ({ page }) => {
    await signInAs(page, USERS.alice, {
      tables: {
        applications: APPLICATIONS_500,
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

  test("500 rows in data → DOM listitem count ≤ 50 (virtualization)", async ({
    page,
  }) => {
    await page.goto("/war-room", { waitUntil: "networkidle" });

    // Wait for the WarTable region to mount. If it never does (e.g., auth
    // redirect loop), the test fails loud rather than silently passing.
    await page.waitForSelector('[aria-label="War Table — Application Pipeline"]', {
      timeout: 10_000,
    });

    // Count listitems inside the war-table region — each one is a rendered
    // application card. With real virtualization this stays ≤ 50 even when
    // the server returned 500 rows.
    const liveRowCount = await page
      .locator(
        '[aria-label="War Table — Application Pipeline"] [role="listitem"]',
      )
      .count();

    expect(
      liveRowCount,
      `Expected virtualization to cap rendered rows at ≤ 50, got ${liveRowCount} ` +
        `(500 rows in data). If this fails, War Room PipelineColumn needs ` +
        `virtual-scroll.`,
    ).toBeLessThanOrEqual(50);
  });

  test("5 reloads → JS heap growth < 20%", async ({ page }) => {
    type MemoryWin = Window & {
      performance: Performance & {
        memory?: { usedJSHeapSize: number };
      };
    };

    const samples: number[] = [];

    for (let i = 0; i < 5; i++) {
      await page.goto("/war-room", { waitUntil: "networkidle" });
      await page.waitForSelector(
        '[aria-label="War Table — Application Pipeline"]',
        { timeout: 10_000 },
      );

      // Let GC settle before sampling. The harness does not force GC (that
      // requires CDP flag); instead we wait for the loop to idle so
      // transient allocations from GSAP / React reconciliation drop out.
      await page.waitForTimeout(250);

      const heap = await page.evaluate(() => {
        const w = window as unknown as MemoryWin;
        return w.performance.memory?.usedJSHeapSize ?? 0;
      });
      samples.push(heap);
    }

    // If the browser doesn't expose performance.memory (non-Chromium or CDP
    // disabled), every sample is 0 — the delta is 0% and the assertion
    // trivially passes. That's acceptable: Chromium exposes it by default
    // and our config pins the project to chromium, so in CI this is bound.
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (first === 0) {
      test.info().annotations.push({
        type: "warning",
        description:
          "performance.memory returned 0 — heap sampling unavailable in this " +
          "environment; assertion skipped silently.",
      });
      return;
    }

    const growthPct = ((last - first) / first) * 100;
    expect(
      growthPct,
      `Heap grew ${growthPct.toFixed(1)}% across 5 reloads ` +
        `(${first} → ${last} bytes). Exceeds 20% threshold — likely leak.`,
    ).toBeLessThan(20);
  });
});
