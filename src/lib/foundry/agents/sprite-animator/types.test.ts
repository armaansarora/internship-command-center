import { describe, expect, it } from "vitest";
import {
  FOUNDRY_SPRITE_ACTIONS,
  FOUNDRY_SPRITE_FORMATS,
  FoundrySpriteAnimatorInputSchema,
  FoundrySpriteSequenceManifestSchema,
  FoundryLottieAnimationManifestSchema,
} from "./types";

describe("foundry sprite-animator types", () => {
  it("declares the 4 action kinds", () => {
    expect(FOUNDRY_SPRITE_ACTIONS).toEqual([
      "idle",
      "wave",
      "nod",
      "celebrate",
    ]);
  });

  it("declares the 2 format kinds", () => {
    expect(FOUNDRY_SPRITE_FORMATS).toEqual(["sprite", "lottie"]);
  });

  it("accepts a sprite input", () => {
    const parsed = FoundrySpriteAnimatorInputSchema.parse({
      runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
      sourcePackId: "char-otis-v3",
      action: "idle",
      format: "sprite",
      requestedBy: "agent",
    });
    expect(parsed.format).toBe("sprite");
    expect(parsed.frameCount).toBe(12);
  });

  it("rejects a sprite input with frameCount=0", () => {
    expect(() =>
      FoundrySpriteAnimatorInputSchema.parse({
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        sourcePackId: "char-otis-v3",
        action: "idle",
        format: "sprite",
        requestedBy: "agent",
        frameCount: 0,
      }),
    ).toThrow();
  });

  it("sprite manifest carries fps + total_duration_ms + frames array", () => {
    const parsed = FoundrySpriteSequenceManifestSchema.parse({
      frames: [
        { index: 0, path: "frame-00.png", perceptualHash: "0123456789abcdef" },
      ],
      fps: 12,
      loops: true,
      frame_count: 1,
      total_duration_ms: 84,
      transitions: [],
    });
    expect(parsed.fps).toBe(12);
  });

  it("lottie manifest carries durationMs + version", () => {
    const parsed = FoundryLottieAnimationManifestSchema.parse({
      lottiePath: "anim.json",
      version: "5.7.0",
      durationMs: 1000,
      motionCurve: "breathing-12fps",
    });
    expect(parsed.durationMs).toBe(1000);
  });
});
