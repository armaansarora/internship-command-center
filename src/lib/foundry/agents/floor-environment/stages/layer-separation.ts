import sharp from "sharp";

/**
 * Critical 1 (pseudo-layers) + Critical 4 (missing lighting layer) fix.
 *
 * Earlier this module derived "background", "midground", and "ambient"
 * layers from a single composite via sharp filters (blur, threshold,
 * greyscale+gamma+threshold). Those layers overlapped heavily and could
 * not be recomposed to reconstruct the original — they were pseudo
 * layers, not honest renders. The 4th "lighting" layer was likewise
 * aspirational and never produced.
 *
 * Honest fix: ship a SINGLE composite per variant. The provider already
 * returns one composite PNG per time-state; we pass it through verbatim
 * and declare `kind: "single-composite"` in the manifest. Real per-layer
 * renders are out of scope for the SDK launch — when we add them they
 * will be independent provider calls, each authored from its own prompt.
 */

export type FoundryFloorCompositeKind = "single-composite";

export const FOUNDRY_FLOOR_COMPOSITE_LAYER_NAME = "composite" as const;
export type FoundryFloorCompositeLayerName =
  typeof FOUNDRY_FLOOR_COMPOSITE_LAYER_NAME;

export interface FoundryFloorCompositeLayerBuffer {
  name: FoundryFloorCompositeLayerName;
  zIndex: 0;
  hasAlpha: boolean;
  bytes: Buffer;
}

export interface FoundryFloorCompositeResult {
  kind: FoundryFloorCompositeKind;
  layers: ReadonlyArray<FoundryFloorCompositeLayerBuffer>;
}

export async function buildFoundryFloorComposite(
  composite: Buffer,
): Promise<FoundryFloorCompositeResult> {
  const meta = await sharp(composite).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("foundry/floor: composite has no dimensions");
  }
  return {
    kind: "single-composite",
    layers: [
      {
        name: FOUNDRY_FLOOR_COMPOSITE_LAYER_NAME,
        zIndex: 0,
        hasAlpha: false,
        bytes: composite,
      },
    ],
  };
}
