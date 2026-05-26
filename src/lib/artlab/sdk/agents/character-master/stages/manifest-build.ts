import { readFile } from "node:fs/promises";
import { createFoundryAssetPack, resolveFoundrySlot, type CreatedFoundryAssetPack } from "@/lib/artlab/sdk/asset-pack";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import type { FoundryCharacterCanon } from "@/lib/artlab/sdk/canon";
import type { ProcessedSprite } from "./cutout-and-feather";

export interface ManifestBuildStageInput {
  character: FoundryCharacterCanon;
  sprites: readonly ProcessedSprite[];
  packDir: string;
  anchorLaneIndex: number;
  providerId: string;
  modelId: string;
  generatedAt: string;
  seed: number;
}

export interface ManifestBuildStageResult {
  pack: CreatedFoundryAssetPack;
  durationMs: number;
}

function inferDirPart(character: FoundryCharacterCanon): string {
  return `${character.floorId}/${character.header.id}`;
}

export async function runManifestBuildStage(input: ManifestBuildStageInput): Promise<ManifestBuildStageResult> {
  const start = performance.now();
  const dirPart = inferDirPart(input.character);
  const primary = input.sprites.find((s) => s.outfit === "regular" && s.pose === "idle") ?? input.sprites[0];
  if (!primary) throw new Error("manifest-build: no sprites to pack");

  const primaryRelPath = `${primary.outfit}/${primary.pose}.webp`;
  const slotId = `${dirPart}/${primary.outfit}/${primary.pose}`;
  const slot = resolveFoundrySlot(slotId);
  if (!slot) {
    throw new Error(`manifest-build: slot not registered: ${slotId}`);
  }

  const payloadFiles = await Promise.all(
    input.sprites.map(async (s) => ({
      relPath: `${s.outfit}/${s.pose}.webp`,
      bytes: await readFile(s.pngPath),
    })),
  );

  // Critical 1: the on-disk manifest now carries the anchor sprite's relPath
  // + perceptual hash so the sprite-animator source-pack resolver can
  // honestly load a real character pack and feed its anchor bytes into the
  // Lottie identity gate. We hash the BYTES we are about to write (the
  // same buffer that ends up at <packDir>/payload/<primaryRelPath>) so the
  // recorded hash is bit-for-bit consistent with the persisted pack.
  const anchorPayload = payloadFiles.find((f) => f.relPath === primaryRelPath);
  if (!anchorPayload) {
    throw new Error(`manifest-build: anchor payload "${primaryRelPath}" not found among prepared payload files`);
  }
  const anchorPerceptualHash = await computePerceptualHash(anchorPayload.bytes);

  const pack = await createFoundryAssetPack({
    packDir: input.packDir,
    kind: "character-spritesheet",
    agent: "character-master",
    canonRefs: {
      characterId: input.character.header.id,
      paletteRef: input.character.paletteRef,
      typographyRef: null,
      motionLanguageRef: null,
    },
    dimensions: {
      sourceWidthPx: 2400,
      sourceHeightPx: 4096,
      displayWidthPx: 160,
      displayHeightPx: 280,
      aspectRatio: "9:16",
    },
    colorTokensUsed: ["primaryDark", "goldAccent"],
    intendedSlot: {
      slotId: slot.slotId,
      appPath: slot.appPath,
      component: slot.component,
      requiresGsap: slot.requiresGsap,
    },
    gsapCues: [],
    accessibility: {
      altText: `${input.character.displayName} character sprite set`,
      role: "img",
      prefersReducedMotionStrategy: "static-fallback",
    },
    integrationSnippetTemplate: "character-sprite-img",
    payloadFiles,
    primaryFileRelPath: primaryRelPath,
    anchorImageRelPath: primaryRelPath,
    anchorPerceptualHash,
    generation: {
      agentName: "character-master",
      provider: input.providerId,
      modelId: input.modelId,
      seed: input.seed,
      costCents: 0,
      durationMs: 0,
      generatedAt: input.generatedAt,
    },
  });

  return { pack, durationMs: Math.round(performance.now() - start) };
}
