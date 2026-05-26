import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import type { FoundryFloorLayerBuffer } from "./stages/layer-separation";
import {
  type FoundryFloorTimeState,
  type FoundryFloorVariantManifest,
} from "./types";

export interface FoundryFloorPackWriteInput {
  runDir: string;
  floorSlug: string;
  variants: ReadonlyArray<{
    timeState: FoundryFloorTimeState;
    layers: ReadonlyArray<FoundryFloorLayerBuffer>;
  }>;
}

export interface FoundryFloorPackWriteResult {
  packRoot: string;
  variantManifests: ReadonlyArray<FoundryFloorVariantManifest>;
}

function atomicWrite(path: string, bytes: Buffer): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, path);
}

export async function writeFoundryFloorPack(
  input: FoundryFloorPackWriteInput,
): Promise<FoundryFloorPackWriteResult> {
  const packRoot = join(input.runDir, "pack");
  mkdirSync(packRoot, { recursive: true });
  const variantManifests: FoundryFloorVariantManifest[] = [];
  for (const variant of input.variants) {
    const variantDir = join(packRoot, variant.timeState);
    mkdirSync(variantDir, { recursive: true });
    const layerManifests = variant.layers
      .map((layer) => {
        const layerPath = join(variantDir, `${layer.name}.png`);
        atomicWrite(layerPath, layer.bytes);
        return {
          name: layer.name,
          path: `${variant.timeState}/${layer.name}.png`,
          zIndex: layer.zIndex,
          hasAlpha: layer.hasAlpha,
        };
      })
      .sort((a, b) => a.zIndex - b.zIndex);
    if (layerManifests.length !== 3) {
      throw new Error(
        `foundry/floor: variant ${variant.timeState} produced ${layerManifests.length} layers (expected 3)`,
      );
    }
    const anchorLayer = variant.layers.find((l) => l.name === "background");
    if (!anchorLayer) {
      throw new Error(
        `foundry/floor: variant ${variant.timeState} missing background layer`,
      );
    }
    const perceptualHash = await computePerceptualHash(anchorLayer.bytes);
    variantManifests.push({
      timeState: variant.timeState,
      layers: layerManifests as FoundryFloorVariantManifest["layers"],
      perceptualHash,
    });
  }
  return { packRoot, variantManifests };
}
