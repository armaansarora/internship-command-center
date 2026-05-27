// src/lib/artlab/sdk/canon/load-rules.ts
//
// Adapter helpers that surface ArtLab SDK canon rule data shaped for the
// downstream ui-texture pipeline. The pipeline tests mock these via
// `vi.mock("@/lib/artlab/sdk/canon")`, so production callers receive defaults
// derived from the canonical YAML where possible and conservative fallbacks
// where the canon has not yet specified a value.

import { join } from "node:path";
import { loadArtLabCanonFile } from "./loader";
import {
  ArtLabIconographyRulesCanonSchema,
  type ArtLabIconographyRulesCanon,
} from "./iconography-rules-schema";

export interface ArtLabIconographyRulesAdapterShape {
  strokeWidthPx: number;
  cornerRadiusPx: number;
  palette: ReadonlyArray<string>;
  viewBox: string;
}

const DEFAULT_ICON_PALETTE: ReadonlyArray<string> = ["#C9A84C", "#1A1A2E"];
const DEFAULT_ICON_VIEWBOX_TEMPLATE = (gridSizePx: number): string =>
  `0 0 ${gridSizePx} ${gridSizePx}`;

export async function loadArtLabIconographyRules(): Promise<ArtLabIconographyRulesAdapterShape | null> {
  try {
    const result = await loadArtLabCanonFile(
      join(process.cwd(), "docs/artlab/sdk/canon/iconography-rules/tower-default.yaml"),
    );
    const parsed: ArtLabIconographyRulesCanon =
      ArtLabIconographyRulesCanonSchema.parse(result.data);
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

export interface ArtLabTextureRulesAdapterShape {
  tileToleranceDeltaE: number;
  targetResolutionPx: number;
  normalMapStrength: number;
}

export async function loadArtLabTextureRules(): Promise<ArtLabTextureRulesAdapterShape | null> {
  return {
    tileToleranceDeltaE: 4,
    targetResolutionPx: 1024,
    normalMapStrength: 0.5,
  };
}
