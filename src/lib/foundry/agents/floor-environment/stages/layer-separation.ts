import sharp from "sharp";
import {
  FOUNDRY_FLOOR_LAYER_NAMES,
  type FoundryFloorLayerName,
} from "../types";

export interface FoundryFloorLayerBuffer {
  name: FoundryFloorLayerName;
  zIndex: number;
  hasAlpha: boolean;
  bytes: Buffer;
}

const LAYER_PIPELINES: ReadonlyArray<{
  name: FoundryFloorLayerName;
  zIndex: number;
  hasAlpha: boolean;
  pipeline: (b: sharp.Sharp) => sharp.Sharp;
}> = [
  {
    name: "background",
    zIndex: 0,
    hasAlpha: false,
    pipeline: (s) =>
      s.removeAlpha().blur(0.4).modulate({ brightness: 0.95, saturation: 0.9 }),
  },
  {
    name: "midground",
    zIndex: 1,
    hasAlpha: true,
    pipeline: (s) =>
      s
        .ensureAlpha()
        .threshold(96, { greyscale: false, grayscale: false })
        .modulate({ brightness: 1.0 }),
  },
  {
    name: "ambient",
    zIndex: 2,
    hasAlpha: true,
    pipeline: (s) =>
      s
        .ensureAlpha()
        .greyscale()
        .gamma(2.2)
        .threshold(180, { greyscale: false, grayscale: false }),
  },
];

export async function separateFoundryFloorLayers(
  composite: Buffer,
): Promise<FoundryFloorLayerBuffer[]> {
  const meta = await sharp(composite).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("foundry/floor: composite has no dimensions");
  }
  const out: FoundryFloorLayerBuffer[] = [];
  for (const spec of LAYER_PIPELINES) {
    const bytes = await spec.pipeline(sharp(composite)).png().toBuffer();
    out.push({
      name: spec.name,
      zIndex: spec.zIndex,
      hasAlpha: spec.hasAlpha,
      bytes,
    });
  }
  if (
    out.length !== FOUNDRY_FLOOR_LAYER_NAMES.length ||
    !FOUNDRY_FLOOR_LAYER_NAMES.every((n, i) => out[i]?.name === n)
  ) {
    throw new Error("foundry/floor: layer separation produced wrong z-order");
  }
  return out;
}
