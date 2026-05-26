import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { separateFoundryFloorLayers } from "./layer-separation";

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 40, g: 60, b: 90, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("separateFoundryFloorLayers", () => {
  it("returns 3 layers in canonical z-order", async () => {
    const composite = await makePng(64, 36);
    const layers = await separateFoundryFloorLayers(composite);
    expect(layers.map((l) => l.name)).toEqual([
      "background",
      "midground",
      "ambient",
    ]);
    expect(layers.map((l) => l.zIndex)).toEqual([0, 1, 2]);
  });

  it("background is fully opaque (no alpha)", async () => {
    const composite = await makePng(64, 36);
    const layers = await separateFoundryFloorLayers(composite);
    const bg = layers.find((l) => l.name === "background");
    expect(bg?.hasAlpha).toBe(false);
  });

  it("midground and ambient carry alpha", async () => {
    const composite = await makePng(64, 36);
    const layers = await separateFoundryFloorLayers(composite);
    const mid = layers.find((l) => l.name === "midground");
    const amb = layers.find((l) => l.name === "ambient");
    expect(mid?.hasAlpha).toBe(true);
    expect(amb?.hasAlpha).toBe(true);
  });

  it("every emitted buffer is a valid PNG", async () => {
    const composite = await makePng(64, 36);
    const layers = await separateFoundryFloorLayers(composite);
    for (const layer of layers) {
      const meta = await sharp(layer.bytes).metadata();
      expect(meta.format).toBe("png");
    }
  });

  it("preserves the source aspect ratio for all layers", async () => {
    const composite = await makePng(64, 36);
    const layers = await separateFoundryFloorLayers(composite);
    for (const layer of layers) {
      const meta = await sharp(layer.bytes).metadata();
      expect(meta.width).toBe(64);
      expect(meta.height).toBe(36);
    }
  });
});
