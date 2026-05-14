import { describe, expect, it } from "vitest";
import { buildCharacterCreativeAdapterSummary } from "./index";

describe("character creative adapter", () => {
  it("exposes existing Otis and Mara character pipeline state to the studio engine", () => {
    const summary = buildCharacterCreativeAdapterSummary();

    expect(summary.assetType).toBe("character");
    expect(summary.completed).toContain("Otis Vale");
    expect(summary.recommendedNext).toContain("Mara Voss");
    expect(summary.commandHints).toContain("npm run art:operate");
    expect(summary.warningCodes).toContain("source-upscaled-to-master");
  });
});
