import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createFoundrySpriteMockLottieProvider } from "./mock-lottie-provider";

async function solid(c: number): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: c, g: c, b: c, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe("createFoundrySpriteMockLottieProvider", () => {
  it("authorLottie returns parseable JSON", async () => {
    const p = createFoundrySpriteMockLottieProvider();
    const out = await p.authorLottie({
      motionCurve: "breathing-12fps",
      durationMs: 1000,
      action: "idle",
    });
    const parsed = JSON.parse(out.lottieJson);
    expect(parsed.v).toBeTruthy();
  });

  it("authored Lottie has matching op-frame for given duration", async () => {
    const p = createFoundrySpriteMockLottieProvider();
    const out = await p.authorLottie({
      motionCurve: "breathing-12fps",
      durationMs: 1000,
      action: "idle",
    });
    const parsed = JSON.parse(out.lottieJson) as { fr: number; op: number };
    expect(parsed.op / parsed.fr).toBeCloseTo(1.0, 1);
  });

  it("authored Lottie has at least one layer with valid index", async () => {
    const p = createFoundrySpriteMockLottieProvider();
    const out = await p.authorLottie({
      motionCurve: "breathing-12fps",
      durationMs: 500,
      action: "idle",
    });
    const parsed = JSON.parse(out.lottieJson) as { layers: Array<{ ind: number }> };
    expect(parsed.layers.length).toBeGreaterThan(0);
    expect(parsed.layers[0]?.ind).toBeGreaterThan(0);
  });

  it("same seed produces same JSON", async () => {
    const p = createFoundrySpriteMockLottieProvider();
    const a = await p.authorLottie({
      motionCurve: "x",
      durationMs: 1000,
      action: "idle",
      seed: 1,
    });
    const b = await p.authorLottie({
      motionCurve: "x",
      durationMs: 1000,
      action: "idle",
      seed: 1,
    });
    expect(a.lottieJson).toBe(b.lottieJson);
  });

  // Critical 3: when referenceImageBytes is provided, the mock must
  // embed it as a base64 asset so the lottie-identity gate can verify.
  it("embeds referenceImageBytes as a base64 asset when provided", async () => {
    const p = createFoundrySpriteMockLottieProvider();
    const bytes = await solid(50);
    const out = await p.authorLottie({
      motionCurve: "breathing-12fps",
      durationMs: 1000,
      action: "idle",
      referenceImageBytes: bytes,
    });
    const parsed = JSON.parse(out.lottieJson) as {
      assets: Array<{ id: string; p: string }>;
    };
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0]?.p).toContain("data:image/png;base64,");
    expect(parsed.assets[0]?.p).toContain(bytes.toString("base64"));
  });

  it("omits assets when no referenceImageBytes is provided", async () => {
    const p = createFoundrySpriteMockLottieProvider();
    const out = await p.authorLottie({
      motionCurve: "breathing-12fps",
      durationMs: 1000,
      action: "idle",
    });
    const parsed = JSON.parse(out.lottieJson) as { assets: unknown[] };
    expect(parsed.assets).toEqual([]);
  });
});
