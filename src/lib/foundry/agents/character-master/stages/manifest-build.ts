import { readFile } from "node:fs/promises";
import { createFoundryAssetPack, resolveFoundrySlot, type CreatedFoundryAssetPack } from "@/lib/foundry/asset-pack";
import type { FoundryCharacterCanon } from "@/lib/foundry/canon";
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
