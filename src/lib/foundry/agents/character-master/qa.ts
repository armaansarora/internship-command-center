import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { hammingDistanceHex } from "@/lib/artlab/coherence/identity-drift";

export interface PaletteSwatch {
  r: number;
  g: number;
  b: number;
  fraction: number;
}

export async function extractDominantPaletteFromImage(
  pngPath: string,
  topK: number,
): Promise<PaletteSwatch[]> {
  const { data, info } = await sharp(pngPath).resize(48, 48, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const buckets = new Map<string, number>();
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]! & 0xf8;
    const g = data[i + 1]! & 0xf8;
    const b = data[i + 2]! & 0xf8;
    const key = `${r}_${g}_${b}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((acc, e) => acc + e[1], 0);
  return sorted.slice(0, topK).map(([key, count]) => {
    const [r, g, b] = key.split("_").map((s) => Number(s));
    return { r: r!, g: g!, b: b!, fraction: count / total };
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function approxLabDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const dr = (a.r - b.r) * 0.30;
  const dg = (a.g - b.g) * 0.59;
  const db = (a.b - b.b) * 0.11;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export interface PaletteMatchGateInput {
  pngPath: string;
  canonTokens: Record<string, string>;
  toleranceLab: number;
}

export type PaletteMatchGateResult =
  | { ok: true; nearestTokenName: string; distance: number }
  | { ok: false; reason: string; nearest: { tokenName: string; distance: number } | null };

export async function runPaletteMatchGate(input: PaletteMatchGateInput): Promise<PaletteMatchGateResult> {
  const top = await extractDominantPaletteFromImage(input.pngPath, 1);
  if (top.length === 0) return { ok: false, reason: "palette: no dominant color extractable", nearest: null };
  const dom = top[0]!;
  let nearestName = "";
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const [tokenName, hex] of Object.entries(input.canonTokens)) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    const d = approxLabDistance(dom, rgb);
    if (d < nearestDist) {
      nearestDist = d;
      nearestName = tokenName;
    }
  }
  if (nearestDist <= input.toleranceLab) {
    return { ok: true, nearestTokenName: nearestName, distance: nearestDist };
  }
  return {
    ok: false,
    reason: `palette: dominant color (${dom.r},${dom.g},${dom.b}) is ${nearestDist.toFixed(2)} units from nearest canon token "${nearestName}" — exceeds tolerance ${input.toleranceLab}`,
    nearest: nearestName ? { tokenName: nearestName, distance: nearestDist } : null,
  };
}

export interface SilhouetteDiversityGateInput {
  pngPaths: readonly string[];
  minPairwiseHamming: number;
}

export type SilhouetteDiversityGateResult =
  | { ok: true; minObservedHamming: number }
  | { ok: false; reason: string; offendingPair: [string, string]; observedHamming: number };

export async function runSilhouetteDiversityGate(
  input: SilhouetteDiversityGateInput,
): Promise<SilhouetteDiversityGateResult> {
  const hashes: Array<{ path: string; hash: string }> = [];
  for (const p of input.pngPaths) {
    hashes.push({ path: p, hash: await computePerceptualHash(await readFile(p)) });
  }
  let minH = Number.POSITIVE_INFINITY;
  let pair: [string, string] = ["", ""];
  for (let i = 0; i < hashes.length; i += 1) {
    for (let j = i + 1; j < hashes.length; j += 1) {
      const h = hammingDistanceHex(hashes[i]!.hash, hashes[j]!.hash);
      if (h < minH) {
        minH = h;
        pair = [hashes[i]!.path, hashes[j]!.path];
      }
    }
  }
  if (!Number.isFinite(minH) || minH >= input.minPairwiseHamming) {
    return { ok: true, minObservedHamming: Number.isFinite(minH) ? minH : 64 };
  }
  return {
    ok: false,
    reason: `silhouette diversity: pairwise hamming ${minH} < required ${input.minPairwiseHamming} — two sprites too similar`,
    offendingPair: pair,
    observedHamming: minH,
  };
}
