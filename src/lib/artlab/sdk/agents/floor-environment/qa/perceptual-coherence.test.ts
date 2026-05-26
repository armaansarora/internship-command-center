import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { evaluateFoundryFloorPerceptualCoherence } from "./perceptual-coherence";

async function colourPng(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r, g, b, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

async function patternPng(): Promise<Buffer> {
  const left = await sharp({
    create: {
      width: 16,
      height: 32,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 0, g: 0, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: left, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

describe("evaluateFoundryFloorPerceptualCoherence", () => {
  it("passes when all variants share a near-identical layout", async () => {
    const base = await colourPng(60, 80, 100);
    const variants = await Promise.all([
      { timeState: "morning" as const, bytes: base },
      { timeState: "midday" as const, bytes: base },
      { timeState: "evening" as const, bytes: base },
    ]);
    const result = await evaluateFoundryFloorPerceptualCoherence(variants);
    expect(result.passed).toBe(true);
    expect(result.maxHamming).toBeLessThan(8);
  });

  it("fails when one variant drifts beyond the threshold", async () => {
    const a = await colourPng(60, 80, 100);
    const b = await colourPng(60, 80, 100);
    const c = await patternPng();
    const result = await evaluateFoundryFloorPerceptualCoherence([
      { timeState: "morning", bytes: a },
      { timeState: "midday", bytes: b },
      { timeState: "evening", bytes: c },
    ]);
    expect(result.passed).toBe(false);
    expect(result.flaggedTimeStates).toContain("evening");
  });

  it("reports the threshold used in the result for transparency", async () => {
    const base = await colourPng(60, 80, 100);
    const result = await evaluateFoundryFloorPerceptualCoherence([
      { timeState: "morning", bytes: base },
      { timeState: "midday", bytes: base },
    ]);
    expect(typeof result.thresholdBits).toBe("number");
    expect(result.thresholdBits).toBeGreaterThan(0);
  });
});
