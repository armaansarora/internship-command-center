// src/lib/artlab/sdk/agents/ui-texture/texture-rules.ts
import { loadArtLabTextureRules } from "@/lib/artlab/sdk/canon";

export interface ArtLabTextureRules {
  tileToleranceDeltaE: number;
  targetResolutionPx: number;
  normalMapStrength: number;
}

export async function loadArtLabTextureRulesAdapter(): Promise<ArtLabTextureRules> {
  const raw = await loadArtLabTextureRules();
  if (!raw) {
    throw new Error("artlab/ui-texture: no texture rules in canon");
  }
  if (raw.normalMapStrength < 0 || raw.normalMapStrength > 1) {
    throw new Error(
      `artlab/ui-texture: normalMapStrength out of [0,1]: ${raw.normalMapStrength}`,
    );
  }
  return {
    tileToleranceDeltaE: raw.tileToleranceDeltaE,
    targetResolutionPx: raw.targetResolutionPx,
    normalMapStrength: raw.normalMapStrength,
  };
}
