// src/lib/artlab/providers/gemini-adapter.test.ts
import { describe, expect, it } from "vitest";
import { createGeminiProvider } from "./gemini-adapter";

describe("gemini provider adapter", () => {
  it("ARTLAB_GEMINI_MODE=mock returns deterministic mock output", async () => {
    process.env.ARTLAB_GEMINI_MODE = "mock";
    const provider = createGeminiProvider({ apiKey: "test" });
    const result = await provider.generateImage({
      prompt: "test prompt",
      aspectRatio: "9:16",
      laneIndex: 1,
    });
    delete process.env.ARTLAB_GEMINI_MODE;
    expect(result.mode).toBe("mock");
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("throws clearly when ARTLAB_GEMINI_MODE is unset and no API key", async () => {
    const provider = createGeminiProvider({ apiKey: "" });
    await expect(provider.generateImage({ prompt: "x", aspectRatio: "9:16", laneIndex: 1 })).rejects.toThrow(/api key/i);
  });
});
