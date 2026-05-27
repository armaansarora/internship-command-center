// src/lib/artlab/sdk/canon/migration-non-character.test.ts
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadArtLabCanon } from "./load-canon";

const CANON_ROOT = join(process.cwd(), "docs/artlab/sdk/canon");

describe("non-character canon migration", () => {
  it("tower-default palette declares primaryDark + goldAccent + glass tokens", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const palette = canon.palettes.find((p) => p.header.id === "tower-default");
    expect(palette).toBeDefined();
    expect(palette?.tokens.primaryDark).toBe("#1A1A2E");
    expect(palette?.tokens.goldAccent).toBe("#C9A84C");
    expect(palette?.scope).toBe("global");
  });

  it("tower-default typography declares the three families", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const typ = canon.typography.find((t) => t.header.id === "tower-default");
    expect(typ?.families.heading).toBe("Playfair Display");
    expect(typ?.families.body).toBe("Satoshi");
    expect(typ?.families.mono).toBe("JetBrains Mono");
    expect(typ?.ramp.length).toBeGreaterThanOrEqual(3);
  });

  it("tower-default motion language declares prefers-reduced-motion principle", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const motion = canon.motionLanguage.find((m) => m.header.id === "tower-default");
    expect(motion?.principles).toContain("respect-prefers-reduced-motion");
  });

  it("tower-default space tokens declare glass blur 16 px", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const space = canon.spaceTokens.find((s) => s.header.id === "tower-default");
    expect(space?.glassBlurPx).toBe(16);
    expect(space?.glassOpacity).toBeGreaterThanOrEqual(0.85);
    expect(space?.glassOpacity).toBeLessThanOrEqual(0.92);
  });

  it("tower-default iconography rules declare regular weight + lucide-equivalent grid", async () => {
    const canon = await loadArtLabCanon({ canonRoot: CANON_ROOT });
    const icono = canon.iconographyRules.find((i) => i.header.id === "tower-default");
    expect(icono?.weight).toBe("regular");
    expect(icono?.gridSizePx).toBe(24);
  });
});
