import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import { runFoundrySpriteQa } from "./qa";

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

function lottieJsonWithAsset(b64?: string): string {
  return JSON.stringify({
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 30,
    w: 200,
    h: 200,
    assets: b64
      ? [
          {
            id: "image_0",
            p: `data:image/png;base64,${b64}`,
            w: 32,
            h: 32,
            e: 1,
          },
        ]
      : [],
    layers: [
      { ind: 1, ty: 4, nm: "x", ip: 0, op: 30, st: 0, ks: {}, sr: 1, bm: 0 },
    ],
  });
}

describe("runFoundrySpriteQa", () => {
  it("sprite kind aggregates pass when both gates pass", async () => {
    const anchor = await solid(50);
    const frames = await Promise.all([solid(50), solid(52), solid(54)]);
    const result = await runFoundrySpriteQa({
      kind: "sprite",
      anchorBytes: anchor,
      frames,
    });
    expect(result.passed).toBe(true);
  });

  it("sprite kind fails when identity-drift fails", async () => {
    const anchor = await solid(50);
    const frames = await Promise.all([solid(50), half(10, 240), solid(50)]);
    const result = await runFoundrySpriteQa({
      kind: "sprite",
      anchorBytes: anchor,
      frames,
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("identity-drift");
  });

  it("sprite kind fails when motion-smoothness fails", async () => {
    const anchor = await solid(50);
    const frames = await Promise.all([solid(50), solid(50), half(10, 240)]);
    const result = await runFoundrySpriteQa({
      kind: "sprite",
      anchorBytes: anchor,
      frames,
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("motion-smoothness");
  });

  it("lottie kind passes when validity AND identity gates pass", async () => {
    const anchorBytes = await solid(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const lottie = lottieJsonWithAsset(anchorBytes.toString("base64"));
    const result = await runFoundrySpriteQa({
      kind: "lottie",
      lottieJson: lottie,
      expectedDurationMs: 1000,
      anchorPerceptualHash: anchorHash,
    });
    expect(result.passed).toBe(true);
    expect(result.failedGates).toEqual([]);
  });

  it("lottie kind fails on malformed JSON (both gates surface)", async () => {
    const result = await runFoundrySpriteQa({
      kind: "lottie",
      lottieJson: "{",
      expectedDurationMs: 1000,
      anchorPerceptualHash: "0000000000000000",
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("lottie-validity");
  });

  it("lottie kind fails on identity drift even when validity passes", async () => {
    const anchorBytes = await solid(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const driftedBytes = await half(10, 240);
    const lottie = lottieJsonWithAsset(driftedBytes.toString("base64"));
    const result = await runFoundrySpriteQa({
      kind: "lottie",
      lottieJson: lottie,
      expectedDurationMs: 1000,
      anchorPerceptualHash: anchorHash,
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("lottie-identity");
  });

  it("lottie kind fails on identity when no image assets are present", async () => {
    const anchorBytes = await solid(50);
    const anchorHash = await computePerceptualHash(anchorBytes);
    const lottie = lottieJsonWithAsset();
    const result = await runFoundrySpriteQa({
      kind: "lottie",
      lottieJson: lottie,
      expectedDurationMs: 1000,
      anchorPerceptualHash: anchorHash,
    });
    expect(result.passed).toBe(false);
    expect(result.failedGates).toContain("lottie-identity");
  });
});
