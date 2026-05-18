import { describe, expect, it } from "vitest";
import { buildCharacterCreativeAdapterSummary } from "./index";

describe("character creative adapter", () => {
  it("exposes the fresh-start character pipeline state to the studio engine", () => {
    const summary = buildCharacterCreativeAdapterSummary();

    expect(summary.assetType).toBe("character");
    expect(summary.completed).toEqual([]);
    expect(summary.recommendedNext).toContain("Otis Vale from-scratch initial design");
    expect(summary.commandHints).toContain("npm run art:operate");
    expect(summary.warningCodes).toEqual([]);
  });
});
