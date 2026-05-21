import { describe, expect, it } from "vitest";
import { computeStyleEnvelopeReport } from "./style-envelope";

describe("style envelope report", () => {
  it("returns cohesion score and drift flags for a set of lanes vs cast", () => {
    const report = computeStyleEnvelopeReport({
      lanes: [
        { laneIndex: 1, silhouette: { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 }, palette: { topColors: [{ r: 100, g: 100, b: 100, weight: 1 }] }, ageImpression: 30 },
      ],
      promotedCast: [
        { characterId: "otis", silhouette: { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 }, palette: { topColors: [{ r: 105, g: 105, b: 105, weight: 1 }] }, ageImpression: 32 },
      ],
    });
    expect(report.lanes[0]!.cohesionScore).toBeGreaterThan(0);
    expect(report.lanes[0]!.flags).toEqual(expect.any(Array));
  });
});
