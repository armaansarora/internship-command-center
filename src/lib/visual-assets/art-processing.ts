import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";
import { CHARACTER_ART_MASTER_LONG_EDGE } from "./art-run";
import type { CharacterFrame } from "./types";

interface ImageIssueOptions {
  minimumLongEdge?: number;
}

export interface ChromaKeyColor {
  r: number;
  g: number;
  b: number;
}

export interface CharacterSourceImagePreflightOptions extends ImageIssueOptions {
  chromaKey?: ChromaKeyColor & {
    tolerance?: number;
  };
}

export interface CharacterSourceImageInspection {
  path: string;
  width: number;
  height: number;
  longEdge: number;
  hasAlpha: boolean;
  format?: string;
  issues: string[];
}

export interface CharacterSourceImagePreflight extends CharacterSourceImageInspection {
  passed: boolean;
  chromaKey?: {
    expected: ChromaKeyColor;
    tolerance: number;
    sampledBorderPixels: number;
    offKeyBorderPixels: number;
  };
}

export interface PrepareCharacterSpriteAssetOptions {
  sourcePath: string;
  masterPath: string;
  stagedRenditionPaths: {
    default: string;
    retina2x: string;
    retina3x: string;
  };
  qaPreviewPaths?: {
    dark: string;
    light: string;
  };
  displayFrame: CharacterFrame;
  masterLongEdge?: number;
}

export interface PreparedCharacterSpriteAsset {
  source: CharacterSourceImageInspection;
  master: CharacterFrame;
  renditions: {
    default: CharacterFrame;
    retina2x: CharacterFrame;
    retina3x: CharacterFrame;
  };
  checksum: string;
  issues: string[];
}

export interface PoseSheetCrop {
  outputPath: string;
  extract: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface SplitCharacterPoseSheetOptions {
  sourcePath: string;
  crops: PoseSheetCrop[];
}

export interface SplitCharacterPoseSheetOutput {
  outputPath: string;
  width: number;
  height: number;
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function checksumFile(filePath: string): Promise<string> {
  const file = await readFile(filePath);

  return `sha256:${createHash("sha256").update(file).digest("hex")}`;
}

export async function inspectCharacterSourceImage(
  path: string,
  { minimumLongEdge = CHARACTER_ART_MASTER_LONG_EDGE }: ImageIssueOptions = {},
): Promise<CharacterSourceImageInspection> {
  const metadata = await sharp(path).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longEdge = Math.max(width, height);
  const hasAlpha = Boolean(metadata.hasAlpha || metadata.channels === 4);
  const issues: string[] = [];

  if (width <= 0 || height <= 0) {
    issues.push("source-dimensions-unreadable");
  }

  if (longEdge < minimumLongEdge) {
    issues.push(`source-long-edge-below-${minimumLongEdge}`);
  }

  if (!hasAlpha) {
    issues.push("source-missing-alpha");
  }

  return {
    path,
    width,
    height,
    longEdge,
    hasAlpha,
    format: metadata.format,
    issues,
  };
}

export async function preflightCharacterSourceImage(
  path: string,
  { minimumLongEdge = CHARACTER_ART_MASTER_LONG_EDGE, chromaKey }: CharacterSourceImagePreflightOptions = {},
): Promise<CharacterSourceImagePreflight> {
  const inspection = await inspectCharacterSourceImage(path, { minimumLongEdge });
  const issues = chromaKey
    ? inspection.issues.filter((issue) => issue !== "source-missing-alpha")
    : [...inspection.issues];
  const chromaInspection = chromaKey
    ? await inspectChromaKeyBorder(path, {
        r: chromaKey.r,
        g: chromaKey.g,
        b: chromaKey.b,
        tolerance: chromaKey.tolerance ?? 12,
      })
    : undefined;

  if (chromaInspection && chromaInspection.offKeyBorderPixels > 0) {
    issues.push("chroma-key-background-not-flat");
  }

  return {
    ...inspection,
    issues,
    passed: issues.length === 0,
    chromaKey: chromaInspection,
  };
}

async function inspectChromaKeyBorder(
  path: string,
  expected: ChromaKeyColor & { tolerance: number },
): Promise<CharacterSourceImagePreflight["chromaKey"]> {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const step = Math.max(1, Math.floor(Math.min(info.width, info.height) / 32));
  const sampled = new Set<string>();
  let sampledBorderPixels = 0;
  let offKeyBorderPixels = 0;

  function sample(x: number, y: number): void {
    const key = `${x}:${y}`;

    if (sampled.has(key)) return;
    sampled.add(key);

    const offset = (y * info.width + x) * info.channels;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const offKey =
      Math.abs(r - expected.r) > expected.tolerance ||
      Math.abs(g - expected.g) > expected.tolerance ||
      Math.abs(b - expected.b) > expected.tolerance;

    sampledBorderPixels += 1;
    if (offKey) offKeyBorderPixels += 1;
  }

  for (let x = 0; x < info.width; x += step) {
    sample(x, 0);
    sample(x, info.height - 1);
  }

  for (let y = 0; y < info.height; y += step) {
    sample(0, y);
    sample(info.width - 1, y);
  }

  return {
    expected: {
      r: expected.r,
      g: expected.g,
      b: expected.b,
    },
    tolerance: expected.tolerance,
    sampledBorderPixels,
    offKeyBorderPixels,
  };
}

async function writeRendition(
  masterPath: string,
  outputPath: string,
  frame: CharacterFrame,
): Promise<CharacterFrame> {
  await ensureParentDirectory(outputPath);
  await sharp(masterPath)
    .resize({
      width: frame.width,
      height: frame.height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 94, smartSubsample: true })
    .toFile(outputPath);

  const metadata = await sharp(outputPath).metadata();

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

async function writeQaPreview(
  masterPath: string,
  outputPath: string,
  background: { r: number; g: number; b: number; alpha: number },
): Promise<void> {
  const previewWidth = 720;
  const previewHeight = 960;
  const spriteWidth = 510;
  const spriteHeight = 870;
  const spriteBuffer = await sharp(masterPath)
    .resize({
      width: spriteWidth,
      height: spriteHeight,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await ensureParentDirectory(outputPath);
  await sharp({
    create: {
      width: previewWidth,
      height: previewHeight,
      channels: 4,
      background,
    },
  })
    .composite([
      {
        input: spriteBuffer,
        left: Math.round((previewWidth - spriteWidth) / 2),
        top: previewHeight - spriteHeight - 28,
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

export async function prepareCharacterSpriteAsset({
  sourcePath,
  masterPath,
  stagedRenditionPaths,
  qaPreviewPaths,
  displayFrame,
  masterLongEdge = CHARACTER_ART_MASTER_LONG_EDGE,
}: PrepareCharacterSpriteAssetOptions): Promise<PreparedCharacterSpriteAsset> {
  const source = await inspectCharacterSourceImage(sourcePath, {
    minimumLongEdge: masterLongEdge,
  });
  const issues = [...source.issues];
  const resizeDimension =
    source.width >= source.height
      ? { width: masterLongEdge }
      : { height: masterLongEdge };

  if (source.longEdge < masterLongEdge) {
    issues.push("source-upscaled-to-master");
  }

  await ensureParentDirectory(masterPath);
  await sharp(sourcePath)
    .ensureAlpha()
    .resize({
      ...resizeDimension,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9 })
    .toFile(masterPath);

  const masterMetadata = await sharp(masterPath).metadata();
  const master = {
    width: masterMetadata.width ?? 0,
    height: masterMetadata.height ?? 0,
  };
  const renditions = {
    default: await writeRendition(masterPath, stagedRenditionPaths.default, displayFrame),
    retina2x: await writeRendition(masterPath, stagedRenditionPaths.retina2x, {
      width: displayFrame.width * 2,
      height: displayFrame.height * 2,
    }),
    retina3x: await writeRendition(masterPath, stagedRenditionPaths.retina3x, {
      width: displayFrame.width * 3,
      height: displayFrame.height * 3,
    }),
  };

  if (qaPreviewPaths) {
    await writeQaPreview(masterPath, qaPreviewPaths.dark, {
      r: 16,
      g: 17,
      b: 20,
      alpha: 1,
    });
    await writeQaPreview(masterPath, qaPreviewPaths.light, {
      r: 244,
      g: 239,
      b: 228,
      alpha: 1,
    });
  }

  if (Math.max(master.width, master.height) < masterLongEdge) {
    issues.push("master-long-edge-below-contract");
  }

  return {
    source,
    master,
    renditions,
    checksum: await checksumFile(stagedRenditionPaths.retina3x),
    issues,
  };
}

export async function splitCharacterPoseSheet({
  sourcePath,
  crops,
}: SplitCharacterPoseSheetOptions): Promise<SplitCharacterPoseSheetOutput[]> {
  const outputs: SplitCharacterPoseSheetOutput[] = [];

  for (const crop of crops) {
    await ensureParentDirectory(crop.outputPath);
    await sharp(sourcePath)
      .extract(crop.extract)
      .png({ compressionLevel: 9 })
      .toFile(crop.outputPath);

    const metadata = await sharp(crop.outputPath).metadata();
    outputs.push({
      outputPath: crop.outputPath,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    });
  }

  return outputs;
}
