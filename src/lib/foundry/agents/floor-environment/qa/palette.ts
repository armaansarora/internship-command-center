import { mkdtempSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  computePaletteHistogram,
  paletteDistance,
  type PaletteHistogram,
} from "@/lib/artlab/coherence/hashes";
import sharp from "sharp";

const PALETTE_DISTANCE_THRESHOLD = 80;

export interface FoundryFloorPaletteReport {
  passed: boolean;
  distance: number;
  thresholdDistance: number;
}

function hexToHistogram(hexes: ReadonlyArray<string>): PaletteHistogram {
  return {
    topColors: hexes.map((hex) => {
      const clean = hex.startsWith("#") ? hex.slice(1) : hex;
      if (clean.length !== 6) {
        throw new Error(`foundry/floor: bad palette hex ${hex}`);
      }
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return { r, g, b, weight: 1 / hexes.length };
    }),
  };
}

async function pngToHistogram(bytes: Buffer): Promise<PaletteHistogram> {
  const dir = mkdtempSync(join(tmpdir(), "foundry-floor-palette-"));
  const tmpPath = join(dir, "image.png");
  await sharp(bytes).toFile(tmpPath);
  try {
    return await computePaletteHistogram(tmpPath);
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}

export async function evaluateFoundryFloorPaletteFit(
  imageBytes: Buffer,
  canonPalette: ReadonlyArray<string>,
): Promise<FoundryFloorPaletteReport> {
  if (canonPalette.length === 0) {
    throw new Error("foundry/floor: canon palette must be non-empty");
  }
  const canonHist = hexToHistogram(canonPalette);
  const imageHist = await pngToHistogram(imageBytes);
  const distance = paletteDistance(canonHist, imageHist);
  return {
    passed: distance < PALETTE_DISTANCE_THRESHOLD,
    distance: Number(distance.toFixed(2)),
    thresholdDistance: PALETTE_DISTANCE_THRESHOLD,
  };
}
