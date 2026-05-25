import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabAssetType } from "../types";
import { renderPlaceholderImage } from "../speed/placeholder-images";
import { displayFor } from "../intake/known-cast";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE: Record<ArtLabAssetType, number> = {
  character: 20,
  environment: 4,
  prop: 6,
  "ui-texture": 6,
  animation: 12,
  scene: 5,
  "icon-system": 8,
  "marketing-hero": 5,
  shader: 3,
};

export const productionRunner: ArtLabRunner = {
  kind: "production",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const target = PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE[input.assetType];
    const dir = join(input.runDir, "production-slots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const slotOutputs: string[] = [];
    for (let i = 1; i <= target; i += 1) {
      if (input.abortSignal?.aborted) {
        return {
          runnerKind: "production",
          status: "failed",
          durationMs: Date.now() - startedAt,
          artifacts: { slotOutputs },
          blockerHint: "cancelled",
          failureCode: "aborted",
        };
      }
      const jsonPath = join(dir, `slot-${i}.json`);
      const pngPath = join(dir, `slot-${i}.png`);
      writeFileSync(jsonPath, JSON.stringify({ slotId: `slot-${i}`, laneIndex: input.approvedLaneIndex, mock: true, alpha: true }));
      const display = displayFor(input.characterId);
      const png = await renderPlaceholderImage({
        title: display.firstName,
        subtitle: `Sprite ${i} of ${target}`,
        laneIndex: input.approvedLaneIndex ?? 1,
      });
      writeFileSync(pngPath, png);
      slotOutputs.push(jsonPath);
    }
    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, slotCount: target },
    };
  },
};
