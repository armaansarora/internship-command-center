import { describe, expect, it } from "vitest";
import {
  ArtLabVideoProviderInputSchema,
  ArtLabVideoProviderResultSchema,
} from "./video-provider";

describe("artlab sdk video provider contract", () => {
  it("input requires prompt, frameCount, fps", () => {
    const ok = ArtLabVideoProviderInputSchema.parse({
      prompt: "Otis breathing idle loop",
      frameCount: 12,
      fps: 12,
    });
    expect(ok.frameCount).toBe(12);
    expect(() =>
      ArtLabVideoProviderInputSchema.parse({ prompt: "x", fps: 12 }),
    ).toThrow();
  });

  it("input accepts optional reference image bytes", () => {
    const ok = ArtLabVideoProviderInputSchema.parse({
      prompt: "x",
      frameCount: 12,
      fps: 12,
      referenceImageBytes: Buffer.from([0x89, 0x50]),
    });
    expect(Buffer.isBuffer(ok.referenceImageBytes)).toBe(true);
  });

  it("result requires frames buffers + costCents + durationMs + mode", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const ok = ArtLabVideoProviderResultSchema.parse({
      frames: [png, png],
      contentType: "image/png",
      mode: "mock",
      costCents: 0,
      durationMs: 1,
    });
    expect(ok.frames).toHaveLength(2);
  });

  it("result rejects empty frames array", () => {
    expect(() =>
      ArtLabVideoProviderResultSchema.parse({
        frames: [],
        contentType: "image/png",
        mode: "real",
        costCents: 0,
        durationMs: 0,
      }),
    ).toThrow();
  });
});
