import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { evaluateFoundryTileContinuity } from "./tile-continuity";

async function uniform(c: number, w = 64, h = 64): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: c, g: c, b: c } },
  })
    .png()
    .toBuffer();
}

async function leftRightSplit(): Promise<Buffer> {
  const left = await sharp({
    create: { width: 32, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
  const right = await sharp({
    create: { width: 32, height: 64, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: 32, top: 0 },
    ])
    .png()
    .toBuffer();
}

describe("evaluateFoundryTileContinuity", () => {
  it("passes on a uniform image (edges identical)", async () => {
    const bytes = await uniform(120);
    const out = await evaluateFoundryTileContinuity(bytes, {
      tileToleranceDeltaE: 5,
    });
    expect(out.passed).toBe(true);
    expect(out.maxDeltaE).toBeLessThan(2);
  });

  it("fails on an image whose left edge differs from right edge", async () => {
    const bytes = await leftRightSplit();
    const out = await evaluateFoundryTileContinuity(bytes, {
      tileToleranceDeltaE: 5,
    });
    expect(out.passed).toBe(false);
    expect(out.maxDeltaE).toBeGreaterThan(50);
  });

  it("reports per-axis distances for transparency", async () => {
    const bytes = await uniform(80);
    const out = await evaluateFoundryTileContinuity(bytes, {
      tileToleranceDeltaE: 5,
    });
    expect(typeof out.horizontalDeltaE).toBe("number");
    expect(typeof out.verticalDeltaE).toBe("number");
  });
});
