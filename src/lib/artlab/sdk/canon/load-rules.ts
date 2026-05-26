// src/lib/foundry/canon/load-rules.ts
//
// Adapter helpers that surface foundry canon rule data shaped for the
// downstream ui-texture pipeline. The pipeline tests mock these via
// `vi.mock("@/lib/artlab/sdk/canon")`, so production callers receive defaults
// derived from the canonical YAML where possible and conservative fallbacks
// where the canon has not yet specified a value.

import { join } from "node:path";
import { loadFoundryCanonFile } from "./loader";
import {
  FoundryIconographyRulesCanonSchema,
  type FoundryIconographyRulesCanon,
} from "./iconography-rules-schema";

export interface FoundryIconographyRulesAdapterShape {
  strokeWidthPx: number;
  cornerRadiusPx: number;
  palette: ReadonlyArray<string>;
  viewBox: string;
}

const DEFAULT_ICON_PALETTE: ReadonlyArray<string> = ["#C9A84C", "#1A1A2E"];
const DEFAULT_ICON_VIEWBOX_TEMPLATE = (gridSizePx: number): string =>
  `0 0 ${gridSizePx} ${gridSizePx}`;

export async function loadFoundryIconographyRules(): Promise<FoundryIconographyRulesAdapterShape | null> {
  try {
    const result = await loadFoundryCanonFile(
      join(process.cwd(), "docs/foundry/canon/iconography-rules/tower-default.yaml"),
    );
    const parsed: FoundryIconographyRulesCanon =
      FoundryIconographyRulesCanonSchema.parse(result.data);
    return {
      strokeWidthPx: parsed.strokeWidthPx,
      cornerRadiusPx: parsed.cornerRadiusPx,
      palette: DEFAULT_ICON_PALETTE,
      viewBox: DEFAULT_ICON_VIEWBOX_TEMPLATE(parsed.gridSizePx),
    };
  } catch {
    return null;
  }
}

export interface FoundryTextureRulesAdapterShape {
  tileToleranceDeltaE: number;
  targetResolutionPx: number;
  normalMapStrength: number;
}

export async function loadFoundryTextureRules(): Promise<FoundryTextureRulesAdapterShape | null> {
  return {
    tileToleranceDeltaE: 4,
    targetResolutionPx: 1024,
    normalMapStrength: 0.5,
  };
}
