import { describe, expect, it } from "vitest";
import { createFoundrySpriteMockLottieProvider } from "./mock-lottie-provider";

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
});
