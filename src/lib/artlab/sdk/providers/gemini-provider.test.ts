import { describe, expect, it } from "vitest";
import { createGeminiArtLabProvider } from "./gemini-provider";

describe("createGeminiArtLabProvider", () => {
  it("returns a provider with stable id 'gemini-artlab'", () => {
    const p = createGeminiArtLabProvider({ apiKey: "k" });
    expect(p.id).toBe("gemini-artlab");
  });

  it("falls through to mock mode when ARTLAB_GEMINI_MODE=mock", async () => {
    const previous = process.env.ARTLAB_GEMINI_MODE;
    process.env.ARTLAB_GEMINI_MODE = "mock";
    try {
      const p = createGeminiArtLabProvider({ apiKey: "k" });
      const r = await p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 1 });
      expect(r.mode).toBe("mock");
      expect(r.contentType).toBe("image/png");
    } finally {
      if (previous === undefined) delete process.env.ARTLAB_GEMINI_MODE;
      else process.env.ARTLAB_GEMINI_MODE = previous;
    }
  });

  it("throws when neither api key nor mock mode is configured", async () => {
    const previous = process.env.ARTLAB_GEMINI_MODE;
    delete process.env.ARTLAB_GEMINI_MODE;
    try {
      const p = createGeminiArtLabProvider({ apiKey: "" });
      await expect(p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 1 })).rejects.toThrow(/api key/i);
    } finally {
      if (previous !== undefined) process.env.ARTLAB_GEMINI_MODE = previous;
    }
  });
});
