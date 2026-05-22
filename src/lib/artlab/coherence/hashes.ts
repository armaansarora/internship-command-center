import sharp from "sharp";

export interface SilhouetteHash {
  bbox: { x: number; y: number; width: number; height: number };
  aspectRatio: number;
}

export interface PaletteEntry {
  r: number;
  g: number;
  b: number;
  weight: number;
}

export interface PaletteHistogram {
  topColors: PaletteEntry[];
}

const QUANT_BUCKETS = 6;

export async function computeSilhouetteHash(imagePath: string): Promise<SilhouetteHash> {
  const image = sharp(imagePath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  let anyOpaque = false;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const idx = (y * info.width + x) * info.channels;
      const alpha = info.channels >= 4 ? data[idx + 3]! : 255;
      if (alpha > 24) {
        anyOpaque = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!anyOpaque) {
    return { bbox: { x: 0, y: 0, width: info.width, height: info.height }, aspectRatio: info.width / info.height };
  }
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return { bbox: { x: minX, y: minY, width, height }, aspectRatio: width / Math.max(height, 1) };
}

function quantize(value: number): number {
  return Math.floor(value / (256 / QUANT_BUCKETS));
}

export async function computePaletteHistogram(imagePath: string): Promise<PaletteHistogram> {
  const { data, info } = await sharp(imagePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${quantize(r)}-${quantize(g)}-${quantize(b)}`;
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    cur.r += r;
    cur.g += g;
    cur.b += b;
    cur.count += 1;
    buckets.set(key, cur);
  }
  const totalPixels = info.width * info.height;
  const top = [...buckets.values()]
    .map((b) => ({ r: Math.round(b.r / b.count), g: Math.round(b.g / b.count), b: Math.round(b.b / b.count), weight: b.count / totalPixels }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  return { topColors: top };
}

export function paletteDistance(a: PaletteHistogram, b: PaletteHistogram): number {
  let total = 0;
  for (let i = 0; i < Math.min(a.topColors.length, b.topColors.length); i += 1) {
    const x = a.topColors[i]!;
    const y = b.topColors[i]!;
    const dr = x.r - y.r;
    const dg = x.g - y.g;
    const db = x.b - y.b;
    total += Math.sqrt(dr * dr + dg * dg + db * db);
  }
  return total / Math.max(Math.min(a.topColors.length, b.topColors.length), 1);
}

export function silhouetteDistance(a: SilhouetteHash, b: SilhouetteHash): number {
  return Math.abs(a.aspectRatio - b.aspectRatio);
}

/**
 * Compute a perceptual hash string from raw image bytes.
 * Returns a compact hex string; two images with identical visual content will
 * return the same hash. Used by the cast-diversity regression suite to detect
 * character silhouette/palette collisions.
 */
export async function computePerceptualHash(bytes: Buffer): Promise<string> {
  const SIZE = 8;
  const { data } = await sharp(bytes)
    .resize(SIZE, SIZE, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Compute mean
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) sum += data[i]!;
  const mean = sum / data.length;
  // Build bit string: 1 if pixel >= mean, else 0
  let bits = 0n;
  for (let i = 0; i < data.length; i += 1) {
    bits = (bits << 1n) | (data[i]! >= mean ? 1n : 0n);
  }
  return bits.toString(16).padStart(SIZE * SIZE / 4, "0");
}
