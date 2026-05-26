// src/lib/artlab/sdk/agents/character-master/stages/cutout-and-feather.ts
//
// Cutout + feather stage for the Tower Art ArtLab's character-master agent.
// Reuses the mature flood-fill + edge-feather + perimeter-sampling primitives
// from `src/lib/artlab/runners/cutout-primitives.ts` — the same module the
// ArtLab `cutout-runner` consumes. This satisfies the ArtLab SDK reuse rule:
// one canonical implementation of the backdrop knockout pipeline.

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  backdropSubtractToRgba,
  classifyAlpha,
  type AlphaSampleReport,
} from "@/lib/artlab/runners/cutout-primitives";
import type { CharacterVariantSprite } from "./variant-fan-out";

export type { AlphaSampleReport };

export interface ProcessedSprite {
  characterId: string;
  outfit: string;
  pose: string;
  pngPath: string;
  alphaSamples: AlphaSampleReport;
  /** Backdrop-quality warning surfaced by the shared cutout primitive. */
  noisyBackdropWarning: boolean;
}

export interface CutoutAndFeatherStageInput {
  sprites: readonly CharacterVariantSprite[];
  workDir: string;
}

export interface CutoutAndFeatherStageResult {
  processedSprites: readonly ProcessedSprite[];
  durationMs: number;
}

export async function runCutoutAndFeatherStage(
  input: CutoutAndFeatherStageInput,
): Promise<CutoutAndFeatherStageResult> {
  const start = performance.now();
  await mkdir(input.workDir, { recursive: true });
  const processed: ProcessedSprite[] = [];
  for (const sprite of input.sprites) {
    const cut = await backdropSubtractToRgba(sprite.bytes);
    const pngPath = join(input.workDir, `${sprite.outfit}__${sprite.pose}.png`);
    await writeFile(pngPath, cut.bytes);
    const alpha = await classifyAlpha(cut.bytes);
    processed.push({
      characterId: sprite.characterId,
      outfit: sprite.outfit,
      pose: sprite.pose,
      pngPath,
      alphaSamples: alpha,
      noisyBackdropWarning: cut.noisyBackdropWarning,
    });
  }
  return { processedSprites: processed, durationMs: Math.round(performance.now() - start) };
}
