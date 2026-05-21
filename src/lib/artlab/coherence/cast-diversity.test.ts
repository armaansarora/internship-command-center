import { describe, expect, it } from "vitest";
import { checkCastDiversity } from "./cast-diversity";

describe("cast diversity check", () => {
  it("passes when 5 lanes have different silhouettes and palettes", () => {
    const result = checkCastDiversity({
      lanes: [
        { laneIndex: 1, silhouette: { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 }, palette: { topColors: [{ r: 200, g: 0, b: 0, weight: 1 }] }, ageImpression: 30 },
        { laneIndex: 2, silhouette: { bbox: { x: 0, y: 0, width: 200, height: 200 }, aspectRatio: 1.0 }, palette: { topColors: [{ r: 0, g: 200, b: 0, weight: 1 }] }, ageImpression: 32 },
        { laneIndex: 3, silhouette: { bbox: { x: 0, y: 0, width: 150, height: 200 }, aspectRatio: 0.75 }, palette: { topColors: [{ r: 0, g: 0, b: 200, weight: 1 }] }, ageImpression: 35 },
        { laneIndex: 4, silhouette: { bbox: { x: 0, y: 0, width: 120, height: 200 }, aspectRatio: 0.6 }, palette: { topColors: [{ r: 200, g: 200, b: 0, weight: 1 }] }, ageImpression: 38 },
        { laneIndex: 5, silhouette: { bbox: { x: 0, y: 0, width: 100, height: 100 }, aspectRatio: 1.0 }, palette: { topColors: [{ r: 100, g: 100, b: 100, weight: 1 }] }, ageImpression: 31 },
      ],
      promotedCast: [],
    });
    expect(result.passed).toBe(true);
  });

  it("fails diversity when two lanes have nearly identical signatures", () => {
    const same = { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 };
    const samePalette = { topColors: [{ r: 200, g: 0, b: 0, weight: 1 }] };
    const result = checkCastDiversity({
      lanes: [
        { laneIndex: 1, silhouette: same, palette: samePalette, ageImpression: 30 },
        { laneIndex: 2, silhouette: same, palette: samePalette, ageImpression: 30 },
        { laneIndex: 3, silhouette: { bbox: { x: 0, y: 0, width: 200, height: 200 }, aspectRatio: 1.0 }, palette: { topColors: [{ r: 0, g: 200, b: 0, weight: 1 }] }, ageImpression: 35 },
        { laneIndex: 4, silhouette: { bbox: { x: 0, y: 0, width: 150, height: 200 }, aspectRatio: 0.75 }, palette: { topColors: [{ r: 0, g: 0, b: 200, weight: 1 }] }, ageImpression: 38 },
        { laneIndex: 5, silhouette: { bbox: { x: 0, y: 0, width: 120, height: 200 }, aspectRatio: 0.6 }, palette: { topColors: [{ r: 200, g: 200, b: 0, weight: 1 }] }, ageImpression: 31 },
      ],
      promotedCast: [],
    });
    expect(result.passed).toBe(false);
    expect(result.failureCodes).toContain("diversity-failure");
  });
});
