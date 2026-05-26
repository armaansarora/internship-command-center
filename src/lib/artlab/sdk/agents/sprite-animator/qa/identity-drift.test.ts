import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { evaluateFoundrySpriteIdentityDrift } from "./identity-drift";

async function solid(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r, g, b, alpha: 1 },
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

describe("evaluateFoundrySpriteIdentityDrift", () => {
  it("passes when frames remain close to anchor", async () => {
    const anchor = await solid(50, 60, 70);
    const frames = await Promise.all([
      solid(50, 60, 70),
      solid(52, 60, 70),
      solid(50, 62, 70),
    ]);
    const result = await evaluateFoundrySpriteIdentityDrift({
      anchorBytes: anchor,
      frames,
    });
    expect(result.passed).toBe(true);
  });

  it("fails when a frame drifts far from anchor", async () => {
    // Anchor is a uniform image; the drifted frame uses a high-contrast
    // half-split pattern so its perceptual hash diverges by >14 bits.
    const anchor = await solid(50, 60, 70);
    const frames = await Promise.all([
      solid(50, 60, 70),
      half(10, 240),
      solid(50, 60, 70),
    ]);
    const result = await evaluateFoundrySpriteIdentityDrift({
      anchorBytes: anchor,
      frames,
    });
    expect(result.passed).toBe(false);
    expect(result.flaggedFrameIndices).toContain(1);
  });

  it("reports avg and max Hamming distance", async () => {
    const anchor = await solid(50, 60, 70);
    const frames = await Promise.all([solid(50, 60, 70), solid(60, 60, 70)]);
    const result = await evaluateFoundrySpriteIdentityDrift({
      anchorBytes: anchor,
      frames,
    });
    expect(typeof result.avgHamming).toBe("number");
    expect(typeof result.maxHamming).toBe("number");
  });

  it("throws when called with empty frames array", async () => {
    const anchor = await solid(50, 60, 70);
    await expect(
      evaluateFoundrySpriteIdentityDrift({ anchorBytes: anchor, frames: [] }),
    ).rejects.toThrow(/at least one frame/i);
  });
});
