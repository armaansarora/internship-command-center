import { describe, expect, it } from "vitest";
import {
  FoundryLottieProviderInputSchema,
  FoundryLottieProviderResultSchema,
} from "./lottie-provider";

describe("foundry lottie provider contract", () => {
  it("input requires motion-curve name and duration", () => {
    const ok = FoundryLottieProviderInputSchema.parse({
      motionCurve: "breathing-12fps",
      durationMs: 1000,
      action: "idle",
    });
    expect(ok.durationMs).toBe(1000);
    expect(() =>
      FoundryLottieProviderInputSchema.parse({
        motionCurve: "x",
        durationMs: 0,
        action: "idle",
      }),
    ).toThrow();
  });

  it("result requires lottie JSON string + mode + cost", () => {
    const ok = FoundryLottieProviderResultSchema.parse({
      lottieJson: '{"v":"5.7.0","ip":0,"op":12,"layers":[]}',
      mode: "mock",
      costCents: 0,
      durationMs: 1,
    });
    expect(ok.mode).toBe("mock");
  });

  it("result rejects unknown mode", () => {
    expect(() =>
      FoundryLottieProviderResultSchema.parse({
        lottieJson: "{}",
        mode: "wat",
        costCents: 0,
        durationMs: 0,
      }),
    ).toThrow();
  });
});
