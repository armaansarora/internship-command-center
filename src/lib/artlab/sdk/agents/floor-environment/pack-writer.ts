import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import type { ArtLabFloorCompositeLayerBuffer } from "./stages/layer-separation";
import {
  type ArtLabFloorCompositeKind,
  type ArtLabFloorTimeState,
  type ArtLabFloorVariantManifest,
} from "./types";

export interface ArtLabFloorPackWriteInput {
  runDir: string;
  floorSlug: string;
  variants: ReadonlyArray<{
    timeState: ArtLabFloorTimeState;
    kind: ArtLabFloorCompositeKind;
    layers: ReadonlyArray<ArtLabFloorCompositeLayerBuffer>;
  }>;
}

export interface ArtLabFloorPackWriteResult {
  packRoot: string;
  variantManifests: ReadonlyArray<ArtLabFloorVariantManifest>;
}

function atomicWrite(path: string, bytes: Buffer): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, path);
}

export async function writeArtLabFloorPack(
  input: ArtLabFloorPackWriteInput,
): Promise<ArtLabFloorPackWriteResult> {
  const packRoot = join(input.runDir, "pack");
  mkdirSync(packRoot, { recursive: true });
  const variantManifests: ArtLabFloorVariantManifest[] = [];
  for (const variant of input.variants) {
    if (variant.kind !== "single-composite") {
      throw new Error(
        `artlab/floor: variant ${variant.timeState} declares unknown kind ${variant.kind}`,
      );
    }
    if (variant.layers.length !== 1) {
      throw new Error(
        `artlab/floor: variant ${variant.timeState} produced ${variant.layers.length} layers (expected 1 for single-composite)`,
      );
    }
    const variantDir = join(packRoot, variant.timeState);
    mkdirSync(variantDir, { recursive: true });
    const layerManifests = variant.layers.map((layer) => {
      const layerPath = join(variantDir, `${layer.name}.png`);
      atomicWrite(layerPath, layer.bytes);
      return {
        name: layer.name,
        path: `${variant.timeState}/${layer.name}.png`,
        zIndex: layer.zIndex,
        hasAlpha: layer.hasAlpha,
      };
    });
    const anchorLayer = variant.layers[0]!;
    const perceptualHash = await computePerceptualHash(anchorLayer.bytes);
    variantManifests.push({
      timeState: variant.timeState,
      kind: variant.kind,
      layers: layerManifests as ArtLabFloorVariantManifest["layers"],
      perceptualHash,
    });
  }
  return { packRoot, variantManifests };
}
