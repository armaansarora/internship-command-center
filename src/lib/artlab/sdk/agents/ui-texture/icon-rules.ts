// src/lib/foundry/agents/ui-texture/icon-rules.ts
import { loadFoundryIconographyRules } from "@/lib/artlab/sdk/canon";

export interface FoundryIconRules {
  strokeWidthPx: number;
  strokeWidthTolerancePx: number;
  cornerRadiusPx: number;
  palette: ReadonlyArray<string>;
  viewBox: string;
}

const STROKE_TOLERANCE_FRACTION = 0.25;

export async function loadFoundryIconRulesAdapter(): Promise<FoundryIconRules> {
  const raw = await loadFoundryIconographyRules();
  if (!raw) {
    throw new Error("foundry/ui-texture: no icon rules in canon");
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
