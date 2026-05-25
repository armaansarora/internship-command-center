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
// Edge feather: pixels at the rim of the flood-filled backdrop get a softer
// alpha so the original backdrop-bleed at the anti-aliased painterly edge
// contributes less to the composite. Hand-coded morphological — sharp.blur
// on a 1-channel raw alpha buffer was destroying interior pixels.
const EDGE_FEATHER_ALPHA = 168;
// Backdrop is considered "noisy" if edge-sample standard deviation exceeds
// this — Gemini occasionally returns a busy scene instead of the prompted
// solid cream backdrop. We surface a warning so the user knows the cutout
// quality may suffer; the cutout still runs.
const BACKDROP_NOISE_STDDEV_THRESHOLD = 28;

interface RgbColor { r: number; g: number; b: number; }

interface BackdropSample {
  color: RgbColor;
  stddev: number;        // perceptual variance of edge samples (R/G/B avg)
  sampleCount: number;
}

function colorDistance(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleBackdrop(buf: Buffer, width: number, height: number, channels: number): BackdropSample {
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
  const avg = { r: sum.r / samples.length, g: sum.g / samples.length, b: sum.b / samples.length };
  // Standard deviation across channels (max of per-channel stddev).
  let rVar = 0, gVar = 0, bVar = 0;
  for (const s of samples) {
    rVar += (s.r - avg.r) ** 2;
    gVar += (s.g - avg.g) ** 2;
    bVar += (s.b - avg.b) ** 2;
  }
  const stddev = Math.max(
    Math.sqrt(rVar / samples.length),
    Math.sqrt(gVar / samples.length),
    Math.sqrt(bVar / samples.length),
  );
  return { color: avg, stddev, sampleCount: samples.length };
}

/**
 * Soften the alpha mask at the rim by one pixel. After flood-fill, alpha is
 * binary 0/255. This pass finds opaque pixels with at least one transparent
 * 4-neighbor and lowers their alpha to EDGE_FEATHER_ALPHA. Single-pass, no
 * sharp/Gaussian — that's what destroyed faces last time.
 */
function featherEdge(alpha: Buffer, width: number, height: number): void {
  // Work on a snapshot so neighbor checks see the pre-feather state.
  const snapshot = Buffer.from(alpha);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (snapshot[idx] !== 255) continue;
      const left = x > 0 ? snapshot[idx - 1] : 255;
      const right = x < width - 1 ? snapshot[idx + 1] : 255;
      const up = y > 0 ? snapshot[idx - width] : 255;
      const down = y < height - 1 ? snapshot[idx + width] : 255;
      if (left === 0 || right === 0 || up === 0 || down === 0) {
        alpha[idx] = EDGE_FEATHER_ALPHA;
      }
    }
  }
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

interface BackdropSubtractResult {
  bytes: Buffer;
  backdropStddev: number;
  backdropColor: RgbColor;
  noisyBackdropWarning: boolean;
  opaquePixelRatio: number;        // fraction of pixels marked as subject (1 - alpha=0 ratio)
}

async function backdropSubtractToRgba(sourceBytes: Buffer): Promise<BackdropSubtractResult> {
  // 1. Decode to raw RGB.
  const decoded = await sharp(sourceBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = decoded.info;
  const rgb = decoded.data;

  // 2. Detect the backdrop color from edge-strip samples (returns variance too).
  const backdrop = sampleBackdrop(rgb, width, height, channels);
  const noisyBackdropWarning = backdrop.stddev > BACKDROP_NOISE_STDDEV_THRESHOLD;

  // 3. Flood-fill backdrop from the perimeter.
  const alpha = floodFillBackdrop(rgb, width, height, channels, backdrop.color);

  // 4. Feather the rim by one pixel for cleaner edges over dark composites.
  featherEdge(alpha, width, height);

  // 5. Compose RGB + alpha → RGBA. Track opaque ratio while we're here.
  const pixelCount = width * height;
  const rgba = Buffer.allocUnsafe(pixelCount * 4);
  let opaqueCount = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;
    rgba[dstIdx] = rgb[srcIdx]!;
    rgba[dstIdx + 1] = rgb[srcIdx + 1]!;
    rgba[dstIdx + 2] = rgb[srcIdx + 2]!;
    const a = alpha[i]!;
    rgba[dstIdx + 3] = a;
    if (a > 200) opaqueCount += 1;
  }

  // 6. Encode as PNG (lossless).
  const bytes = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
  return {
    bytes,
    backdropStddev: backdrop.stddev,
    backdropColor: backdrop.color,
    noisyBackdropWarning,
    opaquePixelRatio: opaqueCount / pixelCount,
  };
}

interface CutoutOutcome {
  cutoutPath: string;
  warning?: { slotId: string; reason: string; backdropStddev?: number; opaqueRatio?: number };
}

async function cutoutOne(
  sourceDir: string,
  cutoutDir: string,
  src: string,
  fallbackPng: Buffer,
): Promise<CutoutOutcome> {
  const delayMs = Number.parseInt(process.env.ARTLAB_CUTOUT_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const dstName = src.replace(/\.json$/, ".png");
  const slotId = dstName.replace(/\.png$/, "");
  const cutoutPath = join(cutoutDir, dstName);
  const srcPng = join(sourceDir, src.replace(/\.json$/, ".png"));
  if (existsSync(srcPng)) {
    try {
      const sourceBytes = readFileSync(srcPng);
      // Skip backdrop-subtract if the source is already a small placeholder
      // (sharp-rendered, no real backdrop to subtract). Heuristic: real
      // Gemini outputs are >150 KB. Placeholders are ~30 KB.
      if (sourceBytes.length > 100_000) {
        const result = await backdropSubtractToRgba(sourceBytes);
        writeFileSync(cutoutPath, result.bytes);
        if (result.noisyBackdropWarning) {
          return {
            cutoutPath,
            warning: {
              slotId,
              reason: "noisy-backdrop",
              backdropStddev: Number(result.backdropStddev.toFixed(2)),
              opaqueRatio: Number(result.opaquePixelRatio.toFixed(3)),
            },
          };
        }
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
  return { cutoutPath };
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
    const outcomes: CutoutOutcome[] = [];
    const display = displayFor(input.characterId);
    const fallbackPng = await renderPlaceholderImage({
      title: display.firstName,
      subtitle: "production sprite · cutout",
    });
    const tasks = sources.map((src) => async () => {
      outcomes.push(await cutoutOne(sourceDir, cutoutDir, src, fallbackPng));
    });
    await runCutoutPool({ tasks });

    const warnings = outcomes.map((o) => o.warning).filter((w): w is NonNullable<typeof w> => Boolean(w));
    if (warnings.length > 0) {
      // Persist a warning sidecar so strict-qa + phase-notifier can surface
      // backdrop-quality drift to the user.
      writeFileSync(
        join(input.runDir, "cutout-warnings.json"),
        JSON.stringify({ count: warnings.length, warnings }, null, 2),
      );
    }

    return {
      runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: {
        cutoutPaths: outcomes.map((o) => o.cutoutPath).sort(),
        warningCount: warnings.length,
      },
    };
  },
};
