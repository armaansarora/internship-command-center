import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { computeSilhouetteHash, computePaletteHistogram } from "./hashes";

describe("perceptual hashes", () => {
  it("computes a silhouette hash from a solid rectangle", async () => {
    const dir = mkdtempSync(join(tmpdir(), "artlab-hash-"));
    const png = await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from("<" + `svg width="128" height="128"><rect x="32" y="32" width="64" height="64" fill="red"/></` + "svg>"), top: 0, left: 0 }])
      .png()
      .toBuffer();
    const path = join(dir, "a.png");
    writeFileSync(path, png);
    const hash = await computeSilhouetteHash(path);
    expect(hash.bbox.width).toBeGreaterThan(0);
    expect(hash.bbox.height).toBeGreaterThan(0);
    expect(hash.aspectRatio).toBeGreaterThan(0);
  });

  it("computes a 5-color palette histogram", async () => {
    const dir = mkdtempSync(join(tmpdir(), "artlab-hash-"));
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 30, g: 30, b: 60 } } })
      .png()
      .toBuffer();
    const path = join(dir, "b.png");
    writeFileSync(path, png);
    const palette = await computePaletteHistogram(path);
    expect(palette.topColors.length).toBeLessThanOrEqual(5);
    expect(palette.topColors[0]!.weight).toBeGreaterThan(0);
  });
});
