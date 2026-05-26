// src/lib/foundry/agents/ui-texture/texture-rules.ts
import { loadFoundryTextureRules } from "@/lib/artlab/sdk/canon";

export interface FoundryTextureRules {
  tileToleranceDeltaE: number;
  targetResolutionPx: number;
  normalMapStrength: number;
}

export async function loadFoundryTextureRulesAdapter(): Promise<FoundryTextureRules> {
  const raw = await loadFoundryTextureRules();
  if (!raw) {
    throw new Error("foundry/ui-texture: no texture rules in canon");
  }
  if (raw.normalMapStrength < 0 || raw.normalMapStrength > 1) {
    throw new Error(
      `foundry/ui-texture: normalMapStrength out of [0,1]: ${raw.normalMapStrength}`,
    );
  }
  return {
    tileToleranceDeltaE: raw.tileToleranceDeltaE,
    targetResolutionPx: raw.targetResolutionPx,
    normalMapStrength: raw.normalMapStrength,
  };
}
