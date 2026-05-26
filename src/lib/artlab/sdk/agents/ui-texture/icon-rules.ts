// src/lib/artlab/sdk/agents/ui-texture/icon-rules.ts
import { loadArtLabIconographyRules } from "@/lib/artlab/sdk/canon";

export interface ArtLabIconRules {
  strokeWidthPx: number;
  strokeWidthTolerancePx: number;
  cornerRadiusPx: number;
  palette: ReadonlyArray<string>;
  viewBox: string;
}

const STROKE_TOLERANCE_FRACTION = 0.25;

export async function loadArtLabIconRulesAdapter(): Promise<ArtLabIconRules> {
  const raw = await loadArtLabIconographyRules();
  if (!raw) {
    throw new Error("artlab/ui-texture: no icon rules in canon");
  }
  return {
    strokeWidthPx: raw.strokeWidthPx,
    strokeWidthTolerancePx: Number(
      (raw.strokeWidthPx * STROKE_TOLERANCE_FRACTION).toFixed(3),
    ),
    cornerRadiusPx: raw.cornerRadiusPx,
    palette: [...raw.palette],
    viewBox: raw.viewBox,
  };
}
