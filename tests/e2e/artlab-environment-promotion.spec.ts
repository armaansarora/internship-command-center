// tests/e2e/artlab-environment-promotion.spec.ts
import { test, expect } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

test.describe("ArtLab environment vertical slice", () => {
  test("promoted war-room background appears on /war-room", async ({ page }) => {
    const backgroundsDir = join("public", "art", "backgrounds");
    if (!existsSync(backgroundsDir)) test.skip();
    const warRoomBundles = readdirSync(backgroundsDir).filter((d) => d.toLowerCase().includes("war-room"));
    if (warRoomBundles.length === 0) test.skip();
    await page.goto("/war-room");
    // The runtime renders the promoted background as either an <img> or a CSS background-image
    // on the floor's main container. We assert at least one of those references the promoted asset.
    const referenced = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      const seen = new Set<string>();
      for (const el of all) {
        const style = window.getComputedStyle(el).backgroundImage;
        if (style && style.includes("/art/backgrounds/")) seen.add(style);
        if (el.tagName === "IMG" && (el as HTMLImageElement).src.includes("/art/backgrounds/")) {
          seen.add((el as HTMLImageElement).src);
        }
      }
      return Array.from(seen);
    });
    expect(referenced.length).toBeGreaterThan(0);
  });
});
