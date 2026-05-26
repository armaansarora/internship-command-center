import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ArtLabAssetPackManifestSchema, type ArtLabAssetPackManifest } from "./manifest.schema";

function arbManifest(): fc.Arbitrary<ArtLabAssetPackManifest> {
  const hex64 = fc.stringMatching(/^[a-f0-9]{64}$/) ?? fc.constant("0".repeat(64));
  const hex16 = fc.stringMatching(/^[a-f0-9]{16}$/) ?? fc.constant("0".repeat(16));
  return fc
    .record({
      manifestVersion: fc.constant("1.0.0" as const),
      packId: fc.uuid(),
      kind: fc.constantFrom("character-sprite", "character-spritesheet", "floor-environment", "ui-texture", "ui-icon", "sprite-animation", "motion-design", "video", "sound"),
      agent: fc.constantFrom("character-master", "floor-environment", "ui-texture", "ui-icon", "sprite-animator", "motion-designer", "video-director", "sound-designer"),
      canonRefs: fc.record({
        characterId: fc.option(fc.constant("sol-navarro"), { nil: null }),
        paletteRef: fc.option(fc.constant("tower-default"), { nil: null }),
        typographyRef: fc.option(fc.constant("tower-default"), { nil: null }),
        motionLanguageRef: fc.option(fc.constant("tower-default"), { nil: null }),
      }).filter((r) => r.characterId !== null || r.paletteRef !== null || r.typographyRef !== null || r.motionLanguageRef !== null),
      dimensions: fc.record({
        sourceWidthPx: fc.integer({ min: 1, max: 8192 }),
        sourceHeightPx: fc.integer({ min: 1, max: 8192 }),
        displayWidthPx: fc.integer({ min: 1, max: 4096 }),
        displayHeightPx: fc.integer({ min: 1, max: 4096 }),
        aspectRatio: fc.constantFrom("9:16", "16:9", "1:1", "4:3", "3:4"),
      }),
      colorTokensUsed: fc.array(fc.constantFrom("primaryDark", "goldAccent", "glassFill"), { maxLength: 8 }),
      intendedSlot: fc.record({
        slotId: fc.constant("lobby/otis/regular/idle"),
        appPath: fc.constant("public/art/lobby/otis/regular/idle.webp"),
        component: fc.option(fc.constant("OtisCharacter"), { nil: null }),
        requiresGsap: fc.boolean(),
      }),
      gsapCues: fc.constant([]),
      accessibility: fc.record({
        altText: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        role: fc.constantFrom("img", "presentation", "button", "link", "none"),
        prefersReducedMotionStrategy: fc.constantFrom("static-fallback", "no-motion", "respect-system"),
      }),
      integrationSnippetTemplate: fc.constant("character-sprite-img"),
      payload: fc.record({
        files: fc.array(fc.record({
          relPath: fc.constant("idle.webp"),
          sha256: hex64,
          bytes: fc.integer({ min: 0, max: 10_000_000 }),
        }), { minLength: 1, maxLength: 1 }),
        primaryFileRelPath: fc.constant("idle.webp"),
      }),
      generation: fc.record({
        agentName: fc.constantFrom("character-master", "floor-environment", "ui-texture", "ui-icon", "sprite-animator", "motion-designer", "video-director", "sound-designer"),
        provider: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        modelId: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        seed: fc.integer(),
        costCents: fc.integer({ min: 0, max: 10000 }),
        durationMs: fc.integer({ min: 0, max: 600000 }),
        generatedAt: fc.constant("2026-05-25T00:00:00.000Z"),
      }),
      anchorHash: hex16,
    })
    .map(({ anchorHash, ...rest }) => {
      // Critical 1 alignment: character-spritesheet manifests must declare
      // anchorImageRelPath + anchorPerceptualHash. The arbitrary payload is
      // pinned to a single `idle.webp` file so the anchor reference is
      // always resolvable.
      if (rest.kind === "character-spritesheet") {
        return {
          ...rest,
          anchorImageRelPath: "idle.webp",
          anchorPerceptualHash: anchorHash,
        } as unknown as ArtLabAssetPackManifest;
      }
      return rest as unknown as ArtLabAssetPackManifest;
    });
}

describe("manifest schema property — parse(stringify(parse(m))) === parse(m)", () => {
  it("survives JSON round-trip for arbitrary valid manifests", () => {
    fc.assert(
      fc.property(arbManifest(), (m) => {
        const once = ArtLabAssetPackManifestSchema.parse(m);
        const twice = ArtLabAssetPackManifestSchema.parse(JSON.parse(JSON.stringify(once)));
        expect(twice).toEqual(once);
      }),
      { numRuns: 200 },
    );
  });
});
