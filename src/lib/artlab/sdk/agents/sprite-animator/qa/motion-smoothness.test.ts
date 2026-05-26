import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { evaluateArtLabSpriteMotionSmoothness } from "./motion-smoothness";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: c, g: c, b: c, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function half(left: number, right: number): Promise<Buffer> {
  const width = 32;
  const height = 32;
  const buf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const value = x < width / 2 ? left : right;
      buf[idx] = value;
      buf[idx + 1] = value;
      buf[idx + 2] = value;
      buf[idx + 3] = 255;
    }
  }
  return sharp(buf, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

describe("evaluateArtLabSpriteMotionSmoothness", () => {
  it("passes when adjacent frames stay close", async () => {
    const frames = await Promise.all([solid(50), solid(52), solid(54)]);
    const result = await evaluateArtLabSpriteMotionSmoothness(frames);
    expect(result.passed).toBe(true);
  });

  it("fails when an adjacent-frame jump exceeds threshold", async () => {
    // Solid-colour fixtures all hash to `ffff…`, so we use a high-contrast
    // half-split as the third frame to provoke a real Hamming spike across
    // the 1→2 transition.
    const frames = await Promise.all([solid(50), solid(50), half(10, 240)]);
    const result = await evaluateArtLabSpriteMotionSmoothness(frames);
    expect(result.passed).toBe(false);
    expect(result.maxAdjacentHamming).toBeGreaterThan(0);
    expect(result.flaggedTransitions).toEqual([
      { from: 1, to: 2, hamming: result.maxAdjacentHamming },
    ]);
  });

  it("requires at least two frames", async () => {
    const frames = await Promise.all([solid(50)]);
    await expect(
      evaluateArtLabSpriteMotionSmoothness(frames),
    ).rejects.toThrow(/two frames/i);
  });
});
