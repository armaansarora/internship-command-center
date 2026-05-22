// tests/e2e/artlab-ui-texture-promotion.spec.ts
import { test, expect } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

test.describe("ArtLab UI texture vertical slice", () => {
  test("promoted button textures appear referenced in CSS", async ({ page }) => {
    const uiDir = join("public", "art", "ui");
    if (!existsSync(uiDir)) test.skip();
    const bundles = readdirSync(uiDir);
    if (bundles.length === 0) test.skip();
    await page.goto("/");
    const referenced = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("button"));
      const seen = new Set<string>();
      for (const el of all) {
        const style = window.getComputedStyle(el).backgroundImage;
        if (style && style.includes("/art/ui/")) seen.add(style);
      }
      return Array.from(seen);
    });
    expect(referenced.length).toBeGreaterThan(0);
  });
});
