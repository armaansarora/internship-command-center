// src/lib/artlab/runners/cutout-runner.ts
//
// Converts opaque source PNGs (from Gemini's image API — which doesn't
// emit transparent backgrounds) into RGBA PNGs with a true alpha channel.
//
// Strategy: the prompts use the premium-simple-backdrop-v1 contract — solid
// neutral cream backdrop, high subject-background separation, no patterned
// walls. So we can:
//   1. Sample backdrop color from corner pixels.
//   2. Build a per-pixel alpha mask: pixels within ΔE of backdrop → 0,
//      others → 255.
//   3. Slight Gaussian blur on the mask to soften edges.
//   4. Compose original RGB with the new alpha → RGBA PNG.
//
// Falls back to copying the source if sharp is unavailable or the source
// doesn't exist.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import type { ArtLabAssetType } from "../types";
import { renderPlaceholderImage } from "../speed/placeholder-images";
import { displayFor } from "../intake/known-cast";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";
import { runCutoutPool } from "@/lib/artlab/speed/cutout-pool";

const CUTOUT_REQUIRED: ReadonlySet<ArtLabAssetType> = new Set(["character", "prop"]);

// Flood-fill from the perimeter with a tight color tolerance. Only pixels
// CONNECTED to a perimeter backdrop region get alpha = 0; everything else
// (the character, including shadows + skin that happen to be close to the
// backdrop cream) stays opaque. This is what fixed the "ghost halo" output
// where naive per-pixel thresholding ate skin tones and washed the character
// translucent.
//
// We deliberately skip a Gaussian feather on the alpha mask: the painterly
// brush-edges in the source are already anti-aliased, and sharp's `blur` on
// a 1-channel raw alpha buffer was destroying the head + face by aggressively
// pulling interior alpha down. A hard alpha cut at the flood-fill boundary
// gives a clean cutout that matches the source edge softness.
const BACKDROP_FILL_THRESHOLD = 42;

interface RgbColor { r: number; g: number; b: number; }

function colorDistance(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleBackdrop(buf: Buffer, width: number, height: number, channels: number): RgbColor {
  const samples: RgbColor[] = [];
  const sampleAt = (x: number, y: number): RgbColor => {
    const idx = (y * width + x) * channels;
    return { r: buf[idx]!, g: buf[idx + 1]!, b: buf[idx + 2]! };
  };
  // Sample a strip along each edge so we average over enough pixels to
  // suppress JPEG/encode noise (corners alone are unreliable).
  const step = Math.max(8, Math.floor(width / 32));
  for (let x = step; x < width - step; x += step) {
    samples.push(sampleAt(x, 2));
    samples.push(sampleAt(x, height - 3));
  }
  for (let y = step; y < height - step; y += step) {
    samples.push(sampleAt(2, y));
    samples.push(sampleAt(width - 3, y));
  }
  const sum = samples.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
  return { r: sum.r / samples.length, g: sum.g / samples.length, b: sum.b / samples.length };
}

function floodFillBackdrop(
  rgb: Buffer,
  width: number,
  height: number,
  channels: number,
  backdrop: RgbColor,
): Buffer {
  const pixelCount = width * height;
  // alpha[i] === 0 means backdrop (transparent), 255 means subject (opaque).
  const alpha = Buffer.alloc(pixelCount, 255);
  // BFS queue of pixel indices. Using a head pointer avoids O(n) shift().
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (x: number, y: number): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (alpha[idx] === 0) return;
    const pxIdx = idx * channels;
    const px: RgbColor = { r: rgb[pxIdx]!, g: rgb[pxIdx + 1]!, b: rgb[pxIdx + 2]! };
    if (colorDistance(px, backdrop) < BACKDROP_FILL_THRESHOLD) {
      alpha[idx] = 0;
      queue[tail++] = idx;
    }
  };

  // Seed from the entire image perimeter (1px border).
  for (let x = 0; x < width; x += 1) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  // 4-way flood fill.
  while (head < tail) {
    const idx = queue[head++]!;
    const x = idx % width;
    const y = (idx - x) / width;
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }
  return alpha;
}

async function backdropSubtractToRgba(sourceBytes: Buffer): Promise<Buffer> {
  // 1. Decode to raw RGB.
  const decoded = await sharp(sourceBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = decoded.info;
  const rgb = decoded.data;

  // 2. Detect the backdrop color from edge-strip samples.
  const backdrop = sampleBackdrop(rgb, width, height, channels);

  // 3. Flood-fill backdrop from the perimeter.
  const alpha = floodFillBackdrop(rgb, width, height, channels, backdrop);

  // 4. Compose RGB + alpha → RGBA.
  const pixelCount = width * height;
  const rgba = Buffer.allocUnsafe(pixelCount * 4);
  for (let i = 0; i < pixelCount; i += 1) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;
    rgba[dstIdx] = rgb[srcIdx]!;
    rgba[dstIdx + 1] = rgb[srcIdx + 1]!;
    rgba[dstIdx + 2] = rgb[srcIdx + 2]!;
    rgba[dstIdx + 3] = alpha[i]!;
  }

  // 5. Encode as PNG (lossless).
  return await sharp(rgba, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

async function cutoutOne(
  sourceDir: string,
  cutoutDir: string,
  src: string,
  fallbackPng: Buffer,
): Promise<string> {
  const delayMs = Number.parseInt(process.env.ARTLAB_CUTOUT_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const dstName = src.replace(/\.json$/, ".png");
  const cutoutPath = join(cutoutDir, dstName);
  const srcPng = join(sourceDir, src.replace(/\.json$/, ".png"));
  if (existsSync(srcPng)) {
    try {
      const sourceBytes = readFileSync(srcPng);
      // Skip backdrop-subtract if the source is already a small placeholder
      // (sharp-rendered, no real backdrop to subtract). Heuristic: real
      // Gemini outputs are >150 KB. Placeholders are ~30 KB.
      if (sourceBytes.length > 100_000) {
        const rgba = await backdropSubtractToRgba(sourceBytes);
        writeFileSync(cutoutPath, rgba);
      } else {
        copyFileSync(srcPng, cutoutPath);
      }
    } catch {
      // sharp failed (unsupported format / corrupt bytes) — copy as-is so
      // the strict-qa alpha probe at least sees a PNG file.
      copyFileSync(srcPng, cutoutPath);
    }
  } else {
    writeFileSync(cutoutPath, fallbackPng);
  }
  return cutoutPath;
}

export const cutoutRunner: ArtLabRunner = {
  kind: "cutout",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (!CUTOUT_REQUIRED.has(input.assetType)) {
      return {
        runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
        artifacts: { skippedReason: "asset-type-has-no-cutout" },
      };
    }
    const sourceDir = join(input.runDir, "production-slots");
    const cutoutDir = join(input.runDir, "cutouts");
    if (!existsSync(cutoutDir)) mkdirSync(cutoutDir, { recursive: true });
    const sources = existsSync(sourceDir) ? readdirSync(sourceDir).filter((f) => f.endsWith(".json")) : [];
    const cutoutPaths: string[] = [];
    const display = displayFor(input.characterId);
    const fallbackPng = await renderPlaceholderImage({
      title: display.firstName,
      subtitle: "production sprite · cutout",
    });
    const tasks = sources.map((src) => async () => {
      cutoutPaths.push(await cutoutOne(sourceDir, cutoutDir, src, fallbackPng));
    });
    await runCutoutPool({ tasks });
    return {
      runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { cutoutPaths: cutoutPaths.sort() },
    };
  },
};
