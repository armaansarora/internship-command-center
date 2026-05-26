import { describe, expect, it } from "vitest";
import { validateFoundryManifestAgainstSlots } from "./manifest-slot-check";
import type { FoundryAssetPackManifest } from "./manifest.schema";

const MANIFEST_BASE: FoundryAssetPackManifest = {
  manifestVersion: "1.0.0",
  packId: "p1",
  kind: "character-sprite",
  agent: "character-master",
  canonRefs: { characterId: "otis", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
  dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 160, displayHeightPx: 280, aspectRatio: "9:16" },
  colorTokensUsed: ["primaryDark"],
  intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
  gsapCues: [],
  accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
  integrationSnippetTemplate: "character-sprite-img",
  payload: { files: [{ relPath: "idle.webp", sha256: "0".repeat(64), bytes: 1 }], primaryFileRelPath: "idle.webp" },
  generation: { agentName: "character-master", provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
};

describe("validateFoundryManifestAgainstSlots", () => {
  it("accepts a manifest whose intendedSlot is registered", () => {
    const result = validateFoundryManifestAgainstSlots(MANIFEST_BASE);
    expect(result.ok).toBe(true);
  });

  it("rejects a manifest whose intendedSlot is not registered", () => {
    const result = validateFoundryManifestAgainstSlots({
      ...MANIFEST_BASE,
      intendedSlot: { ...MANIFEST_BASE.intendedSlot, slotId: "lobby/intruder/rogue" },
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("slot-not-registered");
  });

  it("rejects when slotId is registered but appPath disagrees", () => {
    const result = validateFoundryManifestAgainstSlots({
      ...MANIFEST_BASE,
      intendedSlot: { ...MANIFEST_BASE.intendedSlot, appPath: "public/art/lobby/otis/regular/WRONG.webp" },
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("slot-appath-disagrees");
  });

  it("rejects when slot kind disagrees with manifest kind", () => {
    const result = validateFoundryManifestAgainstSlots({
      ...MANIFEST_BASE,
      kind: "ui-icon",
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("slot-kind-mismatch");
  });
});
