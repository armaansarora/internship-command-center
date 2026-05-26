import { describe, expect, it } from "vitest";
import { ArtLabImageProviderResultSchema, ARTLAB_IMAGE_ASPECT_RATIOS } from "./types";

describe("ArtLabImageProvider types", () => {
  it("declares the legal aspect ratios", () => {
    expect(ARTLAB_IMAGE_ASPECT_RATIOS).toEqual(["9:16", "16:9", "1:1", "4:3", "3:4"]);
  });

  it("accepts a valid provider result", () => {
    expect(() =>
      ArtLabImageProviderResultSchema.parse({
        mode: "real",
        bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        contentType: "image/png",
        widthPx: 1024,
        heightPx: 1792,
        costCents: 4,
        durationMs: 18000,
        providerId: "gemini-2.5-flash-image",
      }),
    ).not.toThrow();
  });

  it("rejects unknown providerId shape", () => {
    expect(() =>
      ArtLabImageProviderResultSchema.parse({ mode: "rogue" }),
    ).toThrow();
  });
});
