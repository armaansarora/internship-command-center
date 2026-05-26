import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { evaluateArtLabLottieIdentity } from "./lottie-identity";

async function solidPng(c: number): Promise<Buffer> {
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

function lottieWithAssets(
  assets: Array<{ id: string; p: string; w?: number; h?: number; e?: number }>,
): string {
  return JSON.stringify({
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 30,
    w: 200,
    h: 200,
    assets,
    layers: [
      { ind: 1, ty: 4, nm: "x", ip: 0, op: 30, st: 0, ks: {}, sr: 1, bm: 0 },
    ],
  });
}

describe("evaluateArtLabLottieIdentity", () => {
  it("passes when an embedded asset's hash matches the anchor within tolerance", async () => {
    const anchorBytes = await solidPng(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const lottieJson = lottieWithAssets([
      {
        id: "image_0",
        p: `data:image/png;base64,${anchorBytes.toString("base64")}`,
        w: 32,
        h: 32,
        e: 1,
      },
    ]);
    const report = await evaluateArtLabLottieIdentity({
      lottieJson,
      anchorPerceptualHash: anchorHash,
    });
    expect(report.passed).toBe(true);
    expect(report.totalImageAssets).toBe(1);
    expect(report.minHamming).toBe(0);
  });

  it("fails when an embedded asset drifts far from the anchor", async () => {
    const anchorBytes = await solidPng(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const driftedBytes = await half(10, 240);
    const lottieJson = lottieWithAssets([
      {
        id: "drifted_char",
        p: `data:image/png;base64,${driftedBytes.toString("base64")}`,
        w: 32,
        h: 32,
        e: 1,
      },
    ]);
    const report = await evaluateArtLabLottieIdentity({
      lottieJson,
      anchorPerceptualHash: anchorHash,
    });
    expect(report.passed).toBe(false);
    expect(report.reason).toMatch(/identity drift/i);
    expect(report.reason).toContain("drifted_char");
    expect(report.minHamming).toBeGreaterThanOrEqual(14);
  });

  it("fails when the Lottie has no image assets (cannot verify identity)", async () => {
    const anchorBytes = await solidPng(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const lottieJson = JSON.stringify({
      v: "5.7.0",
      fr: 30,
      ip: 0,
      op: 30,
      w: 200,
      h: 200,
      assets: [],
      layers: [
        { ind: 1, ty: 4, nm: "circle", ip: 0, op: 30, st: 0, ks: {}, sr: 1, bm: 0 },
      ],
    });
    const report = await evaluateArtLabLottieIdentity({
      lottieJson,
      anchorPerceptualHash: anchorHash,
    });
    expect(report.passed).toBe(false);
    expect(report.reason).toMatch(/no identity-bearing image assets/i);
    expect(report.totalImageAssets).toBe(0);
    expect(report.minHamming).toBeNull();
  });

  it("fails when image assets are external refs (no base64)", async () => {
    const anchorBytes = await solidPng(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const lottieJson = lottieWithAssets([
      { id: "external_image", p: "image_0.png", w: 32, h: 32, e: 0 },
    ]);
    const report = await evaluateArtLabLottieIdentity({
      lottieJson,
      anchorPerceptualHash: anchorHash,
    });
    expect(report.passed).toBe(false);
    expect(report.reason).toMatch(/not embedded as base64/i);
    expect(report.reason).toContain("external_image");
  });

  it("picks the CLOSEST asset when multiple are embedded", async () => {
    const anchorBytes = await solidPng(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const driftedBytes = await half(10, 240);
    const lottieJson = lottieWithAssets([
      { id: "drift_one", p: `data:image/png;base64,${driftedBytes.toString("base64")}`, w: 32, h: 32, e: 1 },
      { id: "match", p: `data:image/png;base64,${anchorBytes.toString("base64")}`, w: 32, h: 32, e: 1 },
    ]);
    const report = await evaluateArtLabLottieIdentity({
      lottieJson,
      anchorPerceptualHash: anchorHash,
    });
    expect(report.passed).toBe(true);
    expect(report.distances[0]?.assetId).toBe("match");
  });

  it("fails with parse error when given malformed JSON", async () => {
    const report = await evaluateArtLabLottieIdentity({
      lottieJson: "{ broken",
      anchorPerceptualHash: "0123456789abcdef",
    });
    expect(report.passed).toBe(false);
    expect(report.reason).toMatch(/parse/i);
  });

  it("throws when the anchor hash is malformed (caller bug)", async () => {
    await expect(
      evaluateArtLabLottieIdentity({
        lottieJson: lottieWithAssets([]),
        anchorPerceptualHash: "not-a-hash",
      }),
    ).rejects.toThrow(/anchorPerceptualHash/);
  });
});
