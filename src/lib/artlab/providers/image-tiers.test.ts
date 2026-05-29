import { describe, expect, it } from "vitest";
import {
  FREE_TIER_IMAGE_MODEL,
  MAX_QUALITY_IMAGE_MODEL,
  isFreeTierImageModel,
  paidImagesAllowed,
  resolveConceptImageModel,
  resolveProductionImageModel,
} from "./image-tiers";

const env = (o: Record<string, string>): NodeJS.ProcessEnv => o as NodeJS.ProcessEnv;

describe("image-tiers — FREE by default, paid is opt-in", () => {
  it("the free default model is gemini-2.5-flash-image", () => {
    expect(FREE_TIER_IMAGE_MODEL).toBe("gemini-2.5-flash-image");
    expect(isFreeTierImageModel(FREE_TIER_IMAGE_MODEL)).toBe(true);
  });

  it("the max-quality model (Nano Banana Pro) is the real API id and NOT free-tier", () => {
    expect(MAX_QUALITY_IMAGE_MODEL).toBe("gemini-3-pro-image-preview");
    expect(isFreeTierImageModel(MAX_QUALITY_IMAGE_MODEL)).toBe(false);
  });

  it("paidImagesAllowed is true only when ARTLAB_ALLOW_PAID_IMAGES=on", () => {
    expect(paidImagesAllowed(env({}))).toBe(false);
    expect(paidImagesAllowed(env({ ARTLAB_ALLOW_PAID_IMAGES: "on" }))).toBe(true);
    expect(paidImagesAllowed(env({ ARTLAB_ALLOW_PAID_IMAGES: "true" }))).toBe(false);
  });

  it("concept + production both default to the free model with no env", () => {
    expect(resolveConceptImageModel(env({})).model).toBe(FREE_TIER_IMAGE_MODEL);
    const prod = resolveProductionImageModel(env({}));
    expect(prod.model).toBe(FREE_TIER_IMAGE_MODEL);
    expect(prod.tier).toBe("free");
    expect(prod.downgraded).toBe(false);
  });

  it("a paid override is DOWNGRADED to free when paid images are not allowed", () => {
    const r = resolveProductionImageModel(env({ ARTLAB_PRODUCTION_IMAGE_MODEL: MAX_QUALITY_IMAGE_MODEL }));
    expect(r.model).toBe(FREE_TIER_IMAGE_MODEL);
    expect(r.tier).toBe("free");
    expect(r.downgraded).toBe(true);
    expect(r.requested).toBe(MAX_QUALITY_IMAGE_MODEL);
  });

  it("a paid override is HONOURED when paid images are explicitly allowed", () => {
    const r = resolveProductionImageModel(
      env({
        ARTLAB_PRODUCTION_IMAGE_MODEL: MAX_QUALITY_IMAGE_MODEL,
        ARTLAB_ALLOW_PAID_IMAGES: "on",
      }),
    );
    expect(r.model).toBe(MAX_QUALITY_IMAGE_MODEL);
    expect(r.tier).toBe("paid");
    expect(r.downgraded).toBe(false);
  });

  it("a free-tier override is always honoured", () => {
    const r = resolveConceptImageModel(env({ ARTLAB_CONCEPT_IMAGE_MODEL: FREE_TIER_IMAGE_MODEL }));
    expect(r.model).toBe(FREE_TIER_IMAGE_MODEL);
    expect(r.downgraded).toBe(false);
  });

  it("the legacy invalid id nano-banana-pro-preview is treated as paid (downgraded when not allowed)", () => {
    const r = resolveProductionImageModel(env({ ARTLAB_PRODUCTION_IMAGE_MODEL: "nano-banana-pro-preview" }));
    expect(r.model).toBe(FREE_TIER_IMAGE_MODEL);
    expect(r.downgraded).toBe(true);
  });
});
