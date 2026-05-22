// src/lib/artlab/intake/bundle-acceptance.test.ts
import { describe, expect, it } from "vitest";
import { parseBundle } from "./bundle-parser";

describe.skip("Phase 6 bundle acceptance — war room with Rafe", () => {
  it("'make the war room with Rafe in it' parses to a bundle with ≥ 2 children", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();
    expect(bundle!.children.length).toBeGreaterThanOrEqual(2);
    const types = bundle!.children.map((c) => c.assetType);
    expect(types).toContain("environment");
    // Rafe co-appears via either a character reference or a scene asset linked to him
    expect(bundle!.links.some((l) => l.linkType === "co-appears-in" || l.linkType === "references")).toBe(true);
  });

  it("promotionPolicy is 'atomic' for war-room bundles (env + character)", () => {
    const bundle = parseBundle("make the war room with Rafe in it");
    expect(bundle).not.toBeNull();
    expect(bundle!.promotionPolicy).toBe("atomic");
  });
});
