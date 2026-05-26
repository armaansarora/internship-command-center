import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { extractArtLabNormalMap } from "./normal-map";

async function solid(c: number, w = 64, h = 64): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: c, g: c, b: c } },
  })
    .png()
    .toBuffer();
}

describe("extractArtLabNormalMap", () => {
  it("returns a PNG of the same dimensions", async () => {
    const src = await solid(128);
    const out = await extractArtLabNormalMap(src, { strength: 0.7 });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
  });

  it("produces a different buffer than the source", async () => {
    const src = await solid(128);
    const out = await extractArtLabNormalMap(src, { strength: 0.7 });
    expect(out.equals(src)).toBe(false);
  });

  it("rejects strength outside [0,1]", async () => {
    const src = await solid(128);
    await expect(
      extractArtLabNormalMap(src, { strength: -0.1 }),
    ).rejects.toThrow(/strength/);
    await expect(
      extractArtLabNormalMap(src, { strength: 1.1 }),
    ).rejects.toThrow(/strength/);
  });
});
