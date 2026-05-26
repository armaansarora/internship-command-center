import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { runFoundryFloorQa } from "./qa";

async function solid(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r, g, b, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

async function patternPng(): Promise<Buffer> {
  const left = await sharp({ create: { width: 16, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  return sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } })
    .composite([{ input: left, top: 0, left: 0 }])
    .png().toBuffer();
}

describe("runFoundryFloorQa", () => {
  it("aggregates pass when every sub-gate passes", async () => {
    const base = await solid(26, 26, 46);
    const result = await runFoundryFloorQa({
      canonPalette: ["#1A1A2E"],
      requiredElements: ["board"],
      reportedElements: ["board"],
      variants: [
        { timeState: "morning", bytes: base },
        { timeState: "midday", bytes: base },
      ],
    });
    expect(result.passed).toBe(true);
    expect(result.failedGates).toEqual([]);
  });

  it("aggregates fail when palette gate fails", async () => {
    const base = await solid(255, 0, 0);
    const result = await runFoundryFloorQa({
      canonPalette: ["#1A1A2E"],
      requiredElements: ["board"],
      reportedElements: ["board"],
      variants: [
        { timeState: "morning", bytes: base },
        { timeState: "midday", bytes: base },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("palette");
  });

  it("aggregates fail when room-elements gate fails", async () => {
    const base = await solid(26, 26, 46);
    const result = await runFoundryFloorQa({
      canonPalette: ["#1A1A2E"],
      requiredElements: ["board", "globe"],
      reportedElements: ["board"],
      variants: [
        { timeState: "morning", bytes: base },
        { timeState: "midday", bytes: base },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("room-elements");
  });

  it("aggregates fail when coherence gate fails", async () => {
    const same = await solid(26, 26, 46);
    const drifted = await patternPng();
    const result = await runFoundryFloorQa({
      canonPalette: ["#1A1A2E", "#C9A84C", "#3F3F4E"],
      requiredElements: ["board"],
      reportedElements: ["board"],
      variants: [
        { timeState: "morning", bytes: same },
        { timeState: "midday", bytes: drifted },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("coherence");
  });
});
