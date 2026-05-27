import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runManifestBuildStage } from "./manifest-build";
import { registerArtLabSlot } from "@/lib/artlab/sdk/asset-pack";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import type { ProcessedSprite } from "./cutout-and-feather";
import type { ArtLabCharacterCanon } from "@/lib/artlab/sdk/canon";

const SOL: ArtLabCharacterCanon = {
  header: { kind: "character", schemaVersion: "1.0.0", id: "sol-navarro", revisedAt: "2026-05-25T00:00:00.000Z" },
  displayName: "Sol Navarro",
  shortLabel: "Sol",
  title: "Chief Networking Officer",
  floorId: "rolodex-lounge",
  floorLabel: "Floor 6",
  styleEnvelope: "tower-flat-plus-depth-v1",
  visualArchetype: "x",
  silhouette: "x",
  wardrobe: "x",
  props: ["x"],
  mobileRead: "x",
  negativeDNA: "x",
  accent: "x",
  doctrine: "x",
  flaw: "x",
  secretStrength: "x",
  wound: "x",
  outfitVariants: ["regular", "summer-light", "winter-layered"],
  poseStates: ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"],
  promotionStatus: "queued",
  paletteRef: "tower-default",
  motionProfile: "x",
  artDirectionNotes: "x",
};

describe("manifest-build stage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-mfb-"));
    for (const outfit of SOL.outfitVariants) {
      for (const pose of SOL.poseStates) {
        try {
          registerArtLabSlot({
            slotId: `rolodex-lounge/sol-navarro/${outfit}/${pose}`,
            appPath: `public/art/rolodex-lounge/sol-navarro/${outfit}/${pose}.webp`,
            kind: "character-sprite",
            component: "SolCharacter",
            requiresGsap: false,
          });
        } catch {
          // already registered
        }
      }
    }
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  async function buildSpriteSet(): Promise<ProcessedSprite[]> {
    const sprites: ProcessedSprite[] = [];
    for (const outfit of SOL.outfitVariants) {
      for (const pose of SOL.poseStates) {
        const png = await sharp({
          create: { width: 32, height: 32, channels: 4, background: { r: 26, g: 26, b: 46, alpha: 1 } },
        }).png().toBuffer();
        const p = join(tmpDir, `${outfit}__${pose}.png`);
        writeFileSync(p, png);
        sprites.push({
          characterId: "sol-navarro",
          outfit,
          pose,
          pngPath: p,
          alphaSamples: { totalOpaquePx: 1024, totalSemiTransparentPx: 0, totalTransparentPx: 0, edgeFeatherAvgAlpha: 255 },
          noisyBackdropWarning: false,
        });
      }
    }
    return sprites;
  }

  it("builds a character-spritesheet pack covering all 21 sprites", async () => {
    const sprites = await buildSpriteSet();
    const result = await runManifestBuildStage({
      character: SOL,
      sprites,
      packDir: join(tmpDir, "pack"),
      anchorLaneIndex: 3,
      providerId: "mock-artlab-image",
      modelId: "mock",
      generatedAt: "2026-05-25T00:00:00.000Z",
      seed: 42,
    });
    expect(result.pack.manifest.kind).toBe("character-spritesheet");
    expect(result.pack.manifest.payload.files.length).toBe(21);
    expect(result.pack.manifest.canonRefs.characterId).toBe("sol-navarro");
  });

  it("emits anchorImageRelPath pointing at the primary sprite (regular/idle)", async () => {
    const sprites = await buildSpriteSet();
    const result = await runManifestBuildStage({
      character: SOL,
      sprites,
      packDir: join(tmpDir, "pack"),
      anchorLaneIndex: 3,
      providerId: "mock-artlab-image",
      modelId: "mock",
      generatedAt: "2026-05-25T00:00:00.000Z",
      seed: 42,
    });
    expect(result.pack.manifest.anchorImageRelPath).toBe("regular/idle.webp");
    expect(
      result.pack.manifest.payload.files.some(
        (f) => f.relPath === result.pack.manifest.anchorImageRelPath,
      ),
    ).toBe(true);
  });

  it("emits anchorPerceptualHash that matches the perceptual hash of the anchor sprite bytes", async () => {
    const sprites = await buildSpriteSet();
    const anchorSprite =
      sprites.find((s) => s.outfit === "regular" && s.pose === "idle") ?? sprites[0]!;
    const result = await runManifestBuildStage({
      character: SOL,
      sprites,
      packDir: join(tmpDir, "pack"),
      anchorLaneIndex: 3,
      providerId: "mock-artlab-image",
      modelId: "mock",
      generatedAt: "2026-05-25T00:00:00.000Z",
      seed: 42,
    });
    expect(result.pack.manifest.anchorPerceptualHash).toMatch(/^[0-9a-f]{16}$/);
    const expected = await computePerceptualHash(readFileSync(anchorSprite.pngPath));
    expect(result.pack.manifest.anchorPerceptualHash).toBe(expected);
  });
});
