import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createFoundrySpriteMockVideoProvider } from "./mock-video-provider";

describe("createFoundrySpriteMockVideoProvider", () => {
  it("returns the requested number of frames", async () => {
    const p = createFoundrySpriteMockVideoProvider();
    const result = await p.generateFrames({ prompt: "x", frameCount: 12, fps: 12 });
    expect(result.frames).toHaveLength(12);
  });

  it("every frame is a valid PNG", async () => {
    const p = createFoundrySpriteMockVideoProvider();
    const result = await p.generateFrames({ prompt: "x", frameCount: 4, fps: 12 });
    for (const f of result.frames) {
      const meta = await sharp(f).metadata();
      expect(meta.format).toBe("png");
    }
  });

  it("frames vary slightly between adjacent indices (motion)", async () => {
    const p = createFoundrySpriteMockVideoProvider();
    const result = await p.generateFrames({ prompt: "x", frameCount: 4, fps: 12 });
    expect(result.frames[0]!.equals(result.frames[1]!)).toBe(false);
  });

  it("same seed produces identical frame sequence", async () => {
    const p = createFoundrySpriteMockVideoProvider();
    const a = await p.generateFrames({ prompt: "x", frameCount: 4, fps: 12, seed: 9 });
    const b = await p.generateFrames({ prompt: "x", frameCount: 4, fps: 12, seed: 9 });
    expect(a.frames.length).toBe(b.frames.length);
    for (let i = 0; i < a.frames.length; i += 1) {
      expect(a.frames[i]!.equals(b.frames[i]!)).toBe(true);
    }
  });
});
