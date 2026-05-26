import sharp from "sharp";

export interface ArtLabTileContinuityRules {
  tileToleranceDeltaE: number;
}

export interface ArtLabTileContinuityReport {
  passed: boolean;
  horizontalDeltaE: number;
  verticalDeltaE: number;
  maxDeltaE: number;
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToLab(r: number, g: number, b: number): [number, number, number] {
  // Approximate CIELAB via sRGB → XYZ → Lab (D65). Sufficient for ΔE tolerance.
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;
  const L = 116 * f(Y / Yn) - 16;
  const a = 500 * (f(X / Xn) - f(Y / Yn));
  const bv = 200 * (f(Y / Yn) - f(Z / Zn));
  return [L, a, bv];
}

function deltaE76(a: [number, number, number], b: [number, number, number]): number {
  const dL = a[0] - b[0];
  const dA = a[1] - b[1];
  const dB = a[2] - b[2];
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

async function rowLab(
  data: Buffer,
  width: number,
  channels: number,
  rowIdx: number,
): Promise<Array<[number, number, number]>> {
  const out: Array<[number, number, number]> = [];
  const base = rowIdx * width * channels;
  for (let x = 0; x < width; x += 1) {
    const idx = base + x * channels;
    out.push(linearToLab(data[idx]!, data[idx + 1]!, data[idx + 2]!));
  }
  return out;
}

async function columnLab(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  colIdx: number,
): Promise<Array<[number, number, number]>> {
  const out: Array<[number, number, number]> = [];
  for (let y = 0; y < height; y += 1) {
    const idx = (y * width + colIdx) * channels;
    out.push(linearToLab(data[idx]!, data[idx + 1]!, data[idx + 2]!));
  }
  return out;
}

export async function evaluateArtLabTileContinuity(
  bytes: Buffer,
  rules: ArtLabTileContinuityRules,
): Promise<ArtLabTileContinuityReport> {
  const { data, info } = await sharp(bytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const left = await columnLab(data, info.width, info.height, info.channels, 0);
  const right = await columnLab(
    data,
    info.width,
    info.height,
    info.channels,
    info.width - 1,
  );
  const top = await rowLab(data, info.width, info.channels, 0);
  const bottom = await rowLab(data, info.width, info.channels, info.height - 1);
  const horizontal =
    left.reduce(
      (acc, lab, i) => acc + deltaE76(lab, right[i] ?? [0, 0, 0]),
      0,
    ) / left.length;
  const vertical =
    top.reduce(
      (acc, lab, i) => acc + deltaE76(lab, bottom[i] ?? [0, 0, 0]),
      0,
    ) / top.length;
  const max = Math.max(horizontal, vertical);
  return {
    passed: max <= rules.tileToleranceDeltaE,
    horizontalDeltaE: Number(horizontal.toFixed(2)),
    verticalDeltaE: Number(vertical.toFixed(2)),
    maxDeltaE: Number(max.toFixed(2)),
  };
}
