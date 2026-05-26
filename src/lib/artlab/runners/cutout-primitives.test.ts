// src/lib/artlab/runners/cutout-primitives.test.ts
//
// Validates the shared cutout-primitives module that BOTH the artlab
// `cutout-runner` and the foundry `cutout-and-feather` stage consume.
// Extracted from the original cutout-runner module so the foundry agent
// can reuse the mature flood-fill + edge-feather + backdrop-sampling logic
// instead of reimplementing per-pixel thresholding from scratch.

import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  backdropSubtractToRgba,
  classifyAlpha,
  floodFillBackdrop,
  featherEdge,
  sampleBackdrop,
  EDGE_FEATHER_ALPHA,
  BACKDROP_FILL_THRESHOLD,
  BACKDROP_NOISE_STDDEV_THRESHOLD,
} from "./cutout-primitives";

async function syntheticSourceWithSolidBackdrop(): Promise<Buffer> {
  // 64×64 image: solid cream backdrop (240,235,220) + dark central square (40,40,60)
  return await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 240, g: 235, b: 220, alpha: 1 } },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 32, height: 32, channels: 4, background: { r: 40, g: 40, b: 60, alpha: 1 } },
        }).png().toBuffer(),
        top: 16,
        left: 16,
      },
    ])
    .png()
    .toBuffer();
}

describe("cutout-primitives — extracted shared module", () => {
  it("exports the public knobs used by the artlab cutout-runner", () => {
    expect(typeof BACKDROP_FILL_THRESHOLD).toBe("number");
    expect(typeof EDGE_FEATHER_ALPHA).toBe("number");
    expect(typeof BACKDROP_NOISE_STDDEV_THRESHOLD).toBe("number");
  });

  it("sampleBackdrop returns an average + stddev for an explicit cream backdrop", async () => {
    const buf = await syntheticSourceWithSolidBackdrop();
    const decoded = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const sample = sampleBackdrop(decoded.data, decoded.info.width, decoded.info.height, decoded.info.channels);
    expect(sample.sampleCount).toBeGreaterThan(0);
    // Sampled perimeter is solid cream → mean should be near the backdrop, low variance.
    expect(sample.color.r).toBeGreaterThan(230);
    expect(sample.color.g).toBeGreaterThan(225);
    expect(sample.color.b).toBeGreaterThan(210);
    expect(sample.stddev).toBeLessThan(BACKDROP_NOISE_STDDEV_THRESHOLD);
  });

  it("floodFillBackdrop marks perimeter cream pixels as alpha=0 and central dark pixels as alpha=255", async () => {
    const buf = await syntheticSourceWithSolidBackdrop();
    const decoded = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = decoded.info;
    const alpha = floodFillBackdrop(decoded.data, width, height, channels, { r: 240, g: 235, b: 220 });
    expect(alpha.length).toBe(width * height);
    // Top-left corner: backdrop → transparent
    expect(alpha[0]).toBe(0);
    // Center of the 32×32 dark square → opaque
    const centerIdx = (height / 2) * width + width / 2;
    expect(alpha[centerIdx]).toBe(255);
  });

  it("featherEdge softens the rim between backdrop and subject without destroying interior alpha", async () => {
    const buf = await syntheticSourceWithSolidBackdrop();
    const decoded = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = decoded.info;
    const alpha = floodFillBackdrop(decoded.data, width, height, channels, { r: 240, g: 235, b: 220 });
    featherEdge(alpha, width, height);
    const centerIdx = (height / 2) * width + width / 2;
    // Interior must still be opaque
    expect(alpha[centerIdx]).toBe(255);
    // At least one rim pixel must now equal EDGE_FEATHER_ALPHA
    let featheredCount = 0;
    for (let i = 0; i < alpha.length; i += 1) {
      if (alpha[i] === EDGE_FEATHER_ALPHA) featheredCount += 1;
    }
    expect(featheredCount).toBeGreaterThan(0);
  });

  it("backdropSubtractToRgba returns RGBA PNG bytes + opaque ratio + warning flag", async () => {
    const buf = await syntheticSourceWithSolidBackdrop();
    const result = await backdropSubtractToRgba(buf);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.opaquePixelRatio).toBeGreaterThan(0);
    expect(result.opaquePixelRatio).toBeLessThan(1);
    expect(typeof result.noisyBackdropWarning).toBe("boolean");
    const meta = await sharp(result.bytes).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("classifyAlpha reports opaque / semi / transparent histograms + edge feather mean", async () => {
    const buf = await syntheticSourceWithSolidBackdrop();
    const cut = await backdropSubtractToRgba(buf);
    const report = await classifyAlpha(cut.bytes);
    expect(report.totalOpaquePx + report.totalSemiTransparentPx + report.totalTransparentPx).toBe(64 * 64);
    expect(report.totalOpaquePx).toBeGreaterThan(0);
    expect(report.totalTransparentPx).toBeGreaterThan(0);
    // Edge ring is sampled at the perimeter — values 0..255
    expect(report.edgeFeatherAvgAlpha).toBeGreaterThanOrEqual(0);
    expect(report.edgeFeatherAvgAlpha).toBeLessThanOrEqual(255);
  });
});
