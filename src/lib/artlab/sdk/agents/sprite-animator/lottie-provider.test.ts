import { describe, expect, it } from "vitest";
import {
  ArtLabLottieProviderInputSchema,
  ArtLabLottieProviderResultSchema,
} from "./lottie-provider";

describe("artlab sdk lottie provider contract", () => {
  it("input requires motion-curve name and duration", () => {
    const ok = ArtLabLottieProviderInputSchema.parse({
      motionCurve: "breathing-12fps",
      durationMs: 1000,
      action: "idle",
    });
    expect(ok.durationMs).toBe(1000);
    expect(() =>
      ArtLabLottieProviderInputSchema.parse({
        motionCurve: "x",
        durationMs: 0,
        action: "idle",
      }),
    ).toThrow();
  });

  it("input accepts an optional referenceImageBytes Buffer (Critical 3)", () => {
    const buf = Buffer.from([1, 2, 3, 4]);
    const ok = ArtLabLottieProviderInputSchema.parse({
      motionCurve: "breathing-12fps",
      durationMs: 1000,
      action: "idle",
      referenceImageBytes: buf,
    });
    expect(ok.referenceImageBytes?.equals(buf)).toBe(true);
  });

  it("result requires lottie JSON string + mode + cost", () => {
    const ok = ArtLabLottieProviderResultSchema.parse({
      lottieJson: '{"v":"5.7.0","ip":0,"op":12,"layers":[]}',
      mode: "mock",
      costCents: 0,
      durationMs: 1,
    });
    expect(ok.mode).toBe("mock");
  });

  it("result rejects unknown mode", () => {
    expect(() =>
      ArtLabLottieProviderResultSchema.parse({
        lottieJson: "{}",
        mode: "wat",
        costCents: 0,
        durationMs: 0,
      }),
    ).toThrow();
  });
});
