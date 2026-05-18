import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import sharp from "sharp";

export interface SolidMatteAlphaExtractionReport {
  schemaVersion: "tower-solid-matte-alpha-extraction-v1";
  sourcePath: string;
  outputPath: string;
  width: number;
  height: number;
  matteColor: string;
  transparentPixels: number;
  softPixels: number;
  opaquePixels: number;
}

export interface SolidMatteAlphaExtractionInput {
  sourcePath: string;
  outputPath: string;
  matteColor?: string;
  tolerance?: number;
  softness?: number;
  borderSamplePixels?: number;
  minimumBorderMatchRatio?: number;
}

export interface SolidMatteAlphaReadinessInput {
  sourcePath: string;
  matteColor?: string;
  tolerance?: number;
  borderSamplePixels?: number;
  minimumBorderMatchRatio?: number;
}

export interface SolidMatteAlphaReadinessReport {
  schemaVersion: "tower-solid-matte-alpha-readiness-v1";
  sourcePath: string;
  safe: boolean;
  reason: string;
  width?: number;
  height?: number;
  matteColor: string;
  borderMatchRatio: number;
  minimumBorderMatchRatio: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(value: string): Rgb {
  const normalized = value.trim().replace(/^#/, "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error("matteColor must be a six-digit hex color, such as #00ff00.");
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function colorDistance(data: Buffer, offset: number, color: Rgb): number {
  const dr = data[offset] - color.r;
  const dg = data[offset + 1] - color.g;
  const db = data[offset + 2] - color.b;

  return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
}

function measureFlatBorderMatte(input: {
  data: Buffer;
  width: number;
  height: number;
  matte: Rgb;
  tolerance: number;
  borderSamplePixels: number;
}): number {
  let sampled = 0;
  let matching = 0;

  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const inBorder = x < input.borderSamplePixels
        || y < input.borderSamplePixels
        || x >= input.width - input.borderSamplePixels
        || y >= input.height - input.borderSamplePixels;

      if (!inBorder) continue;

      sampled += 1;
      const offset = ((y * input.width) + x) * 4;

      if (colorDistance(input.data, offset, input.matte) <= input.tolerance) {
        matching += 1;
      }
    }
  }

  return sampled ? matching / sampled : 0;
}

function assertFlatBorderMatte(input: {
  data: Buffer;
  width: number;
  height: number;
  matte: Rgb;
  tolerance: number;
  borderSamplePixels: number;
  minimumBorderMatchRatio: number;
}): void {
  const ratio = measureFlatBorderMatte(input);

  if (ratio < input.minimumBorderMatchRatio) {
    throw new Error(`matte background is not flat enough for loss-safe alpha extraction (${Math.round(ratio * 100)}% border match).`);
  }
}

export async function inspectSolidMatteAlphaReadiness(
  input: SolidMatteAlphaReadinessInput,
): Promise<SolidMatteAlphaReadinessReport> {
  const matteColor = input.matteColor ?? "#00ff00";
  const matte = parseHexColor(matteColor);
  const tolerance = input.tolerance ?? 10;
  const borderSamplePixels = input.borderSamplePixels ?? 4;
  const minimumBorderMatchRatio = input.minimumBorderMatchRatio ?? 0.98;

  try {
    const { data, info } = await sharp(input.sourcePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const borderMatchRatio = measureFlatBorderMatte({
      data,
      width: info.width,
      height: info.height,
      matte,
      tolerance,
      borderSamplePixels,
    });
    const safe = borderMatchRatio >= minimumBorderMatchRatio;

    return {
      schemaVersion: "tower-solid-matte-alpha-readiness-v1",
      sourcePath: input.sourcePath,
      safe,
      reason: safe
        ? "Source border matches the requested flat chroma matte."
        : `Source border is not flat enough for loss-safe alpha extraction (${Math.round(borderMatchRatio * 100)}% border match).`,
      width: info.width,
      height: info.height,
      matteColor,
      borderMatchRatio,
      minimumBorderMatchRatio,
    };
  } catch (error) {
    return {
      schemaVersion: "tower-solid-matte-alpha-readiness-v1",
      sourcePath: input.sourcePath,
      safe: false,
      reason: `Source could not be inspected for alpha repair: ${error instanceof Error ? error.message : String(error)}`,
      matteColor,
      borderMatchRatio: 0,
      minimumBorderMatchRatio,
    };
  }
}

export async function extractSolidMatteAlpha(
  input: SolidMatteAlphaExtractionInput,
): Promise<SolidMatteAlphaExtractionReport> {
  const matteColor = input.matteColor ?? "#00ff00";
  const matte = parseHexColor(matteColor);
  const tolerance = input.tolerance ?? 10;
  const softness = input.softness ?? 36;
  const borderSamplePixels = input.borderSamplePixels ?? 4;
  const minimumBorderMatchRatio = input.minimumBorderMatchRatio ?? 0.98;
  const { data, info } = await sharp(input.sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assertFlatBorderMatte({
    data,
    width: info.width,
    height: info.height,
    matte,
    tolerance,
    borderSamplePixels,
    minimumBorderMatchRatio,
  });

  let transparentPixels = 0;
  let softPixels = 0;
  let opaquePixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const distance = colorDistance(data, index, matte);
    const extractedAlpha = distance <= tolerance
      ? 0
      : distance >= tolerance + softness
        ? 255
        : clampChannel(((distance - tolerance) / softness) * 255);
    const originalAlpha = data[index + 3];
    const alpha = Math.min(originalAlpha, extractedAlpha);

    if (alpha === 0) {
      transparentPixels += 1;
    } else if (alpha === 255) {
      opaquePixels += 1;
    } else {
      softPixels += 1;
      const normalizedAlpha = alpha / 255;

      data[index] = clampChannel((data[index] - (matte.r * (1 - normalizedAlpha))) / normalizedAlpha);
      data[index + 1] = clampChannel((data[index + 1] - (matte.g * (1 - normalizedAlpha))) / normalizedAlpha);
      data[index + 2] = clampChannel((data[index + 2] - (matte.b * (1 - normalizedAlpha))) / normalizedAlpha);
    }

    data[index + 3] = alpha;
  }

  await mkdir(dirname(input.outputPath), { recursive: true });
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png().toFile(input.outputPath);

  return {
    schemaVersion: "tower-solid-matte-alpha-extraction-v1",
    sourcePath: input.sourcePath,
    outputPath: input.outputPath,
    width: info.width,
    height: info.height,
    matteColor,
    transparentPixels,
    softPixels,
    opaquePixels,
  };
}
