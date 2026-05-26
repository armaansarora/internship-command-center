import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runManifestBuildStage } from "./manifest-build";
import { registerFoundrySlot } from "@/lib/foundry/asset-pack";
import type { ProcessedSprite } from "./cutout-and-feather";
import type { FoundryCharacterCanon } from "@/lib/foundry/canon";

const SOL: FoundryCharacterCanon = {
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
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-mfb-"));
    for (const outfit of SOL.outfitVariants) {
      for (const pose of SOL.poseStates) {
        try {
          registerFoundrySlot({
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

  it("builds a character-spritesheet pack covering all 21 sprites", async () => {
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
        });
      }
    }
    const result = await runManifestBuildStage({
      character: SOL,
      sprites,
      packDir: join(tmpDir, "pack"),
      anchorLaneIndex: 3,
      providerId: "mock-foundry-image",
      modelId: "mock",
      generatedAt: "2026-05-25T00:00:00.000Z",
      seed: 42,
    });
    expect(result.pack.manifest.kind).toBe("character-spritesheet");
    expect(result.pack.manifest.payload.files.length).toBe(21);
    expect(result.pack.manifest.canonRefs.characterId).toBe("sol-navarro");
  });
});
