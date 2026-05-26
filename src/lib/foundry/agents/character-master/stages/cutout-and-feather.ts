import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { CharacterVariantSprite } from "./variant-fan-out";

export interface AlphaSampleReport {
  totalOpaquePx: number;
  totalSemiTransparentPx: number;
  totalTransparentPx: number;
  edgeFeatherAvgAlpha: number;
}

export interface ProcessedSprite {
  characterId: string;
  outfit: string;
  pose: string;
  pngPath: string;
  alphaSamples: AlphaSampleReport;
}

export interface CutoutAndFeatherStageInput {
  sprites: readonly CharacterVariantSprite[];
  workDir: string;
}

export interface CutoutAndFeatherStageResult {
  processedSprites: readonly ProcessedSprite[];
  durationMs: number;
}

const FEATHER_THRESHOLD_DARK = 80;
const FEATHER_THRESHOLD_LIGHT = 220;

async function classifyAlpha(buf: Buffer): Promise<AlphaSampleReport> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let opaque = 0, semi = 0, transparent = 0, edgeFeatherSum = 0, edgeFeatherCount = 0;
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

async function knockoutNeutralBackdrop(buf: Buffer): Promise<Buffer> {
  const img = sharp(buf).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i]!;
    const g = out[i + 1]!;
    const b = out[i + 2]!;
    const isLightBackdrop = r >= FEATHER_THRESHOLD_LIGHT && g >= FEATHER_THRESHOLD_LIGHT && b >= FEATHER_THRESHOLD_LIGHT;
    if (isLightBackdrop) {
      out[i + 3] = 0;
    } else if (r >= FEATHER_THRESHOLD_LIGHT - 30 && g >= FEATHER_THRESHOLD_LIGHT - 30 && b >= FEATHER_THRESHOLD_LIGHT - 30) {
      out[i + 3] = 128;
    }
    void FEATHER_THRESHOLD_DARK;
  }
  return await sharp(out, { raw: { width: info.width, height: info.height, channels } }).png().toBuffer();
}

export async function runCutoutAndFeatherStage(input: CutoutAndFeatherStageInput): Promise<CutoutAndFeatherStageResult> {
  const start = performance.now();
  await mkdir(input.workDir, { recursive: true });
  const processed: ProcessedSprite[] = [];
  for (const sprite of input.sprites) {
    const cutBytes = await knockoutNeutralBackdrop(sprite.bytes);
    const pngPath = join(input.workDir, `${sprite.outfit}__${sprite.pose}.png`);
    await writeFile(pngPath, cutBytes);
    const alpha = await classifyAlpha(cutBytes);
    processed.push({
      characterId: sprite.characterId,
      outfit: sprite.outfit,
      pose: sprite.pose,
      pngPath,
      alphaSamples: alpha,
    });
  }
  return { processedSprites: processed, durationMs: Math.round(performance.now() - start) };
}
