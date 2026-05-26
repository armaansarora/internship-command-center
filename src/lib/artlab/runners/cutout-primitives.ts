// src/lib/artlab/runners/cutout-primitives.ts
//
// Shared cutout primitives: flood-fill backdrop knockout, single-pass edge
// feather, perimeter color sampling with stddev, RGBA composition, and an
// alpha-histogram classifier. Extracted from the original `cutout-runner`
// module so the Tower Art ArtLab's `character-master` agent can reuse the
// same mature implementation instead of reimplementing per-pixel
// thresholding from scratch. Behavior is unchanged for the artlab runner —
// this is a pure code-motion refactor.
//
// Design notes from the original cutout-runner:
//   • Flood-fill from the image perimeter with tight color tolerance, so
//     subject pixels whose color happens to land near the cream backdrop
//     (skin tones, off-white props) are NOT eaten the way naive per-pixel
//     thresholding does.
//   • Edge feather is a single hand-coded morphological pass on the alpha
//     buffer — never sharp.blur(); that destroyed faces in early iterations
//     by aggressively pulling interior alpha down.
//   • Backdrop sampling uses an edge-strip average + per-channel stddev so
//     we can flag noisy backdrops (Gemini occasionally returns a busy scene
//     instead of the prompted solid cream) without aborting the cutout.

import sharp from "sharp";

/**
 * Flood-fill color tolerance: pixels within this Euclidean RGB distance of
 * the sampled backdrop color are eligible to be marked transparent during
 * the perimeter flood-fill. Loose enough to handle anti-aliased painterly
 * edges; tight enough to preserve skin/hair tones.
 */
export const BACKDROP_FILL_THRESHOLD = 42;

/**
 * Alpha value applied to the one-pixel rim of opaque subject pixels that
 * border a freshly-transparent backdrop pixel. Soft enough to soften the
 * silhouette over dark composites; high enough to preserve the painterly
 * source edge.
 */
export const EDGE_FEATHER_ALPHA = 168;

/**
 * Backdrop is considered "noisy" if the perimeter-sample stddev exceeds this
 * threshold across any channel. We surface a warning so the user knows the
 * cutout quality may suffer; the cutout still runs.
 */
export const BACKDROP_NOISE_STDDEV_THRESHOLD = 28;

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface BackdropSample {
  color: RgbColor;
  /** Max per-channel stddev across all perimeter samples (R/G/B). */
  stddev: number;
  sampleCount: number;
}

export interface BackdropSubtractResult {
  bytes: Buffer;
  backdropStddev: number;
  backdropColor: RgbColor;
  noisyBackdropWarning: boolean;
  /** Fraction of pixels marked as subject (alpha > 200). */
  opaquePixelRatio: number;
}

/**
 * Per-pixel alpha histogram + perimeter-edge feather report. Used by the
 * ArtLab SDK character-master stage to surface per-sprite alpha health.
 */
export interface AlphaSampleReport {
  totalOpaquePx: number;
  totalSemiTransparentPx: number;
  totalTransparentPx: number;
  edgeFeatherAvgAlpha: number;
}

export function colorDistance(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Sample a strip along each image edge to estimate the backdrop color and
 * its variance. Corner-only samples are unreliable on JPEG/encode noise.
 */
export function sampleBackdrop(
  buf: Buffer,
  width: number,
  height: number,
  channels: number,
): BackdropSample {
  const samples: RgbColor[] = [];
  const sampleAt = (x: number, y: number): RgbColor => {
    const idx = (y * width + x) * channels;
    return { r: buf[idx]!, g: buf[idx + 1]!, b: buf[idx + 2]! };
  };
  const step = Math.max(8, Math.floor(width / 32));
  for (let x = step; x < width - step; x += step) {
    samples.push(sampleAt(x, 2));
    samples.push(sampleAt(x, height - 3));
  }
  for (let y = step; y < height - step; y += step) {
    samples.push(sampleAt(2, y));
    samples.push(sampleAt(width - 3, y));
  }
  const sum = samples.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 },
  );
  const avg = { r: sum.r / samples.length, g: sum.g / samples.length, b: sum.b / samples.length };
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
 * 4-connected BFS flood-fill from the image perimeter. Returns a 1-channel
 * alpha buffer where 0 = backdrop (transparent) and 255 = subject (opaque).
 * Only pixels CONNECTED to a perimeter backdrop region are knocked out, so
 * interior pixels that happen to land near the backdrop color are preserved.
 */
export function floodFillBackdrop(
  rgb: Buffer,
  width: number,
  height: number,
  channels: number,
  backdrop: RgbColor,
): Buffer {
  const pixelCount = width * height;
  const alpha = Buffer.alloc(pixelCount, 255);
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

  for (let x = 0; x < width; x += 1) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

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

/**
 * Soften the alpha mask at the rim by one pixel. After flood-fill, alpha is
 * binary 0/255. This pass finds opaque pixels with at least one transparent
 * 4-neighbor and lowers their alpha to {@link EDGE_FEATHER_ALPHA}.
 * Single-pass, no sharp/Gaussian — that's what destroyed faces last time.
 */
export function featherEdge(alpha: Buffer, width: number, height: number): void {
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

/**
 * Convert an opaque source PNG (no transparent backdrop) into an RGBA PNG
 * with a true alpha channel. Pipeline:
 *   1. Decode to raw RGB.
 *   2. Sample the perimeter to estimate the backdrop color + variance.
 *   3. Flood-fill the backdrop from the perimeter (preserves interior pixels).
 *   4. Single-pass edge feather to soften the silhouette by one pixel.
 *   5. Compose RGB + alpha → RGBA, track opaque pixel ratio.
 *   6. Encode as PNG (lossless).
 */
export async function backdropSubtractToRgba(sourceBytes: Buffer): Promise<BackdropSubtractResult> {
  const decoded = await sharp(sourceBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = decoded.info;
  const rgb = decoded.data;

  const backdrop = sampleBackdrop(rgb, width, height, channels);
  const noisyBackdropWarning = backdrop.stddev > BACKDROP_NOISE_STDDEV_THRESHOLD;

  const alpha = floodFillBackdrop(rgb, width, height, channels, backdrop.color);
  featherEdge(alpha, width, height);

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

/**
 * Classify the alpha channel of an RGBA PNG into opaque (>=250), transparent
 * (<=5), and semi-transparent (anything else) buckets, plus the perimeter
 * edge-feather mean alpha. Used by the ArtLab SDK character-master stage to
 * surface per-sprite alpha health alongside each PNG.
 */
export async function classifyAlpha(buf: Buffer): Promise<AlphaSampleReport> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let opaque = 0;
  let semi = 0;
  let transparent = 0;
  let edgeFeatherSum = 0;
  let edgeFeatherCount = 0;
  const width = info.width;
  const height = info.height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * channels + 3]!;
      if (a >= 250) opaque += 1;
      else if (a <= 5) transparent += 1;
      else semi += 1;
      const onEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (onEdge) {
        edgeFeatherSum += a;
        edgeFeatherCount += 1;
      }
    }
  }
  return {
    totalOpaquePx: opaque,
    totalSemiTransparentPx: semi,
    totalTransparentPx: transparent,
    edgeFeatherAvgAlpha: edgeFeatherCount === 0 ? 0 : Math.round(edgeFeatherSum / edgeFeatherCount),
  };
}
