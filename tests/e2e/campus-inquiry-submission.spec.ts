import { test, expect } from "@playwright/test";

/**
 * Campus pilot inquiry — public-page submission shape.
 *
 * Server-action side effects (Resend, audit log) are covered by the unit
 * suite. This e2e proves the realised public-page contract — /campus is
 * reachable without auth, the inquiry form renders, every field has an
 * associated label, and the submit affordance is keyboard-reachable.
 */
test.describe("campus pilot inquiry — public submission shape", () => {
  test("loads /campus without auth and surfaces the inquiry form", async ({ page }) => {
    const res = await page.goto("/campus", { waitUntil: "domcontentloaded" });
    expect(res?.status() ?? 0).toBeLessThan(400);
    await expect(page.locator('[data-testid="campus-inquiry-form"]')).toBeVisible();
    await expect(page.getByLabel("School / institution")).toBeVisible();
    await expect(page.getByLabel("Your name")).toBeVisible();
    await expect(page.getByLabel("Role at school")).toBeVisible();
    await expect(page.getByLabel("Work email")).toBeVisible();
    await expect(page.getByLabel("Approximate cohort size")).toBeVisible();
    await expect(page.getByLabel("Target intake season")).toBeVisible();
  });

  test("/campus is indexable (no robots noindex/nofollow)", async ({ page }) => {
    await page.goto("/campus", { waitUntil: "domcontentloaded" });
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots ?? "").not.toMatch(/noindex|nofollow/i);
  });

  test("submit button is keyboard-reachable on /campus", async ({ page }) => {
    await page.goto("/campus", { waitUntil: "domcontentloaded" });
    const submit = page.getByRole("button", { name: /request a pilot proposal/i });
    await expect(submit).toBeVisible();
    const tabIndex = await submit.getAttribute("tabindex");
    if (tabIndex !== null) {
      expect(Number.parseInt(tabIndex, 10)).toBeGreaterThanOrEqual(0);
    }
  });
});
