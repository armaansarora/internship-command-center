import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { evaluateFoundryFloorPaletteFit } from "./palette";

async function solid(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r, g, b, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe("evaluateFoundryFloorPaletteFit", () => {
  it("passes when the image is near the canon palette", async () => {
    const bytes = await solid(26, 26, 46);
    const report = await evaluateFoundryFloorPaletteFit(bytes, ["#1A1A2E", "#C9A84C"]);
    expect(report.passed).toBe(true);
    expect(report.distance).toBeLessThan(20);
  });

  it("fails when the image is far from the canon palette", async () => {
    const bytes = await solid(255, 0, 0);
    const report = await evaluateFoundryFloorPaletteFit(bytes, ["#1A1A2E", "#C9A84C"]);
    expect(report.passed).toBe(false);
  });

  it("returns the distance threshold for transparency", async () => {
    const bytes = await solid(26, 26, 46);
    const report = await evaluateFoundryFloorPaletteFit(bytes, ["#1A1A2E"]);
    expect(typeof report.thresholdDistance).toBe("number");
  });

  it("throws on empty canon palette", async () => {
    const bytes = await solid(0, 0, 0);
    await expect(evaluateFoundryFloorPaletteFit(bytes, [])).rejects.toThrow(
      /palette/i,
    );
  });
});
