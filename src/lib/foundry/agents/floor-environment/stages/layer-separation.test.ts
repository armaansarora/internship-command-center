import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { buildFoundryFloorComposite } from "./layer-separation";

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

// Critical 1 + Critical 4 fix: the previous implementation derived
// "background", "midground", and "ambient" from one composite via sharp
// filters (blur, threshold, greyscale+gamma+threshold). They overlapped
// heavily and could not be recomposed to reconstruct the original — pseudo
// layers. The honest spec is a single composite per variant; the 4th
// "lighting" layer was likewise aspirational and is not produced.
describe("buildFoundryFloorComposite (single-composite, honest)", () => {
  it("returns exactly one composite layer flagged kind=single-composite", async () => {
    const composite = await makePng(64, 36);
    const result = await buildFoundryFloorComposite(composite);
    expect(result.kind).toBe("single-composite");
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0]?.name).toBe("composite");
  });

  it("the composite layer is at z-index 0 and fully opaque", async () => {
    const composite = await makePng(64, 36);
    const result = await buildFoundryFloorComposite(composite);
    const only = result.layers[0]!;
    expect(only.zIndex).toBe(0);
    expect(only.hasAlpha).toBe(false);
  });

  it("ships the source bytes verbatim (no transform pipeline)", async () => {
    const composite = await makePng(64, 36);
    const result = await buildFoundryFloorComposite(composite);
    const only = result.layers[0]!;
    expect(only.bytes.equals(composite)).toBe(true);
  });

  it("emitted buffer is a valid PNG with source dimensions", async () => {
    const composite = await makePng(64, 36);
    const result = await buildFoundryFloorComposite(composite);
    const meta = await sharp(result.layers[0]!.bytes).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(36);
  });

  it("rejects a composite with no dimensions", async () => {
    await expect(
      buildFoundryFloorComposite(Buffer.from([])),
    ).rejects.toThrow();
  });
});
