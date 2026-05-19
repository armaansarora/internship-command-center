import { describe, expect, it } from "vitest";
import {
  CREATIVE_PROVIDER_CAPABILITIES,
  getCreativeProviderCapability,
} from "./index";

describe("creative provider capability profiles", () => {
  it("treats Gemini Nano Banana 2 as high-resolution opaque source art, not true transparent production alpha", () => {
    const profile = getCreativeProviderCapability("gemini-api");

    expect(profile.model).toBe("gemini-3.1-flash-image-preview");
    expect(profile.supportsReferenceImages).toBe(true);
    expect(profile.supportsTrueAlpha).toBe(false);
    expect(profile.requiresLocalAlphaForCharacters).toBe(true);
    expect(profile.defaultCostPer4KImageCents).toBeCloseTo(15.1);
  });

  it("declares capability profiles for every configured generation adapter", () => {
    expect(Object.keys(CREATIVE_PROVIDER_CAPABILITIES).sort()).toEqual([
      "chatgpt-subscription-inbox",
      "gemini-api",
      "gemini-subscription-browser",
      "local-mock",
      "openai-api",
    ]);
  });
});
