import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  extractDominantPaletteFromImage,
  runPaletteMatchGate,
  runSilhouetteDiversityGate,
} from "./qa";

async function solidImg(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return await sharp({
    create: { width: 32, height: 32, channels: 4, background: { ...color, alpha: 1 } },
  }).png().toBuffer();
}

describe("artlab sdk character-master qa", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-qa-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("extracts the dominant color from a solid image within tolerance", async () => {
    const bytes = await solidImg({ r: 200, g: 100, b: 50 });
    const f = join(tmpDir, "x.png");
    writeFileSync(f, bytes);
    const palette = await extractDominantPaletteFromImage(f, 1);
    expect(palette.length).toBe(1);
    expect(Math.abs(palette[0]!.r - 200)).toBeLessThan(10);
    expect(Math.abs(palette[0]!.g - 100)).toBeLessThan(10);
    expect(Math.abs(palette[0]!.b - 50)).toBeLessThan(10);
  });

  it("palette match gate passes when dominant color is near a canon token", async () => {
    const bytes = await solidImg({ r: 26, g: 26, b: 46 });
    const f = join(tmpDir, "near.png");
    writeFileSync(f, bytes);
    const result = await runPaletteMatchGate({ pngPath: f, canonTokens: { primaryDark: "#1A1A2E" }, toleranceLab: 10 });
    expect(result.ok).toBe(true);
  });

  it("palette match gate fails when dominant color is far from any canon token", async () => {
    const bytes = await solidImg({ r: 250, g: 250, b: 250 });
    const f = join(tmpDir, "far.png");
    writeFileSync(f, bytes);
    const result = await runPaletteMatchGate({ pngPath: f, canonTokens: { primaryDark: "#1A1A2E" }, toleranceLab: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/palette/i);
  });

  it("silhouette diversity gate fails when two sprites are too similar", async () => {
    const bytes = await solidImg({ r: 50, g: 50, b: 50 });
    const a = join(tmpDir, "a.png");
    const b = join(tmpDir, "b.png");
    writeFileSync(a, bytes);
    writeFileSync(b, bytes);
    const result = await runSilhouetteDiversityGate({ pngPaths: [a, b], minPairwiseHamming: 8 });
    expect(result.ok).toBe(false);
  });
});
