import { describe, expect, it } from "vitest";
import { loadCoherenceThresholds } from "./thresholds";

describe("coherence thresholds", () => {
  it("loads default thresholds with the expected keys", () => {
    const t = loadCoherenceThresholds();
    expect(t.silhouette.minPairwiseDistance).toBeGreaterThan(0);
    expect(t.palette.minPairwiseDistance).toBeGreaterThan(0);
    expect(t.palette.maxCohesionDistance).toBeGreaterThan(0);
    expect(t.age.maxImpressionGapYears).toBeGreaterThan(0);
  });
});
