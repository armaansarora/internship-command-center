import { describe, expect, it } from "vitest";
import {
  ARTLAB_SPRITE_ACTIONS,
  ARTLAB_SPRITE_FORMATS,
  ArtLabSpriteAnimatorInputSchema,
  ArtLabSpriteSequenceManifestSchema,
  ArtLabLottieAnimationManifestSchema,
} from "./types";

describe("artlab sdk sprite-animator types", () => {
  it("declares the 4 action kinds", () => {
    expect(ARTLAB_SPRITE_ACTIONS).toEqual([
      "idle",
      "wave",
      "nod",
      "celebrate",
    ]);
  });

  it("declares the 2 format kinds", () => {
    expect(ARTLAB_SPRITE_FORMATS).toEqual(["sprite", "lottie"]);
  });

  it("accepts a sprite input", () => {
    const parsed = ArtLabSpriteAnimatorInputSchema.parse({
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
      ArtLabSpriteAnimatorInputSchema.parse({
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
    const parsed = ArtLabSpriteSequenceManifestSchema.parse({
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
    const parsed = ArtLabLottieAnimationManifestSchema.parse({
      lottiePath: "anim.json",
      version: "5.7.0",
      durationMs: 1000,
      motionCurve: "breathing-12fps",
    });
    expect(parsed.durationMs).toBe(1000);
  });
});
