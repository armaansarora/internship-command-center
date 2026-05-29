// src/lib/artlab/providers/gemini-adapter.test.ts
import { describe, expect, it } from "vitest";
import { createGeminiProvider, resolveAdapterImageModel } from "./gemini-adapter";

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

describe("resolveAdapterImageModel — cost guard for no-modelId callers", () => {
  const env = (o: Record<string, string>): NodeJS.ProcessEnv => o as NodeJS.ProcessEnv;

  it("returns the explicit modelId when provided", () => {
    expect(resolveAdapterImageModel("gemini-3-pro-image-preview", env({}))).toBe("gemini-3-pro-image-preview");
  });

  it("defaults to the FREE model when nothing is set", () => {
    expect(resolveAdapterImageModel(undefined, env({}))).toBe("gemini-2.5-flash-image");
  });

  it("IGNORES a paid ARTLAB_GEMINI_IMAGE_MODEL unless paid images are allowed (closes the bypass)", () => {
    expect(
      resolveAdapterImageModel(undefined, env({ ARTLAB_GEMINI_IMAGE_MODEL: "gemini-3-pro-image-preview" })),
    ).toBe("gemini-2.5-flash-image");
  });

  it("honours a paid ARTLAB_GEMINI_IMAGE_MODEL when ARTLAB_ALLOW_PAID_IMAGES=on", () => {
    expect(
      resolveAdapterImageModel(
        undefined,
        env({ ARTLAB_GEMINI_IMAGE_MODEL: "gemini-3-pro-image-preview", ARTLAB_ALLOW_PAID_IMAGES: "on" }),
      ),
    ).toBe("gemini-3-pro-image-preview");
  });

  it("honours a free-tier ARTLAB_GEMINI_IMAGE_MODEL without the paid flag", () => {
    expect(
      resolveAdapterImageModel(undefined, env({ ARTLAB_GEMINI_IMAGE_MODEL: "gemini-2.5-flash-image" })),
    ).toBe("gemini-2.5-flash-image");
  });
});
