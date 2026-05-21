import { paletteDistance, silhouetteDistance } from "./hashes";
import type { LaneSignature, PromotedCastSignature, CoherenceFailureCode } from "./cast-diversity";
import { loadCoherenceThresholds } from "./thresholds";

export interface LaneEnvelopeReport {
  laneIndex: number;
  cohesionScore: number;
  flags: CoherenceFailureCode[];
}

export interface StyleEnvelopeReport {
  lanes: LaneEnvelopeReport[];
}

export function computeStyleEnvelopeReport(input: { lanes: LaneSignature[]; promotedCast: PromotedCastSignature[] }): StyleEnvelopeReport {
  const thresholds = loadCoherenceThresholds();
  const lanes = input.lanes.map((lane) => {
    let bestSilhouette = Infinity;
    let bestPalette = Infinity;
    const flags = new Set<CoherenceFailureCode>();
    for (const cast of input.promotedCast) {
      const sd = silhouetteDistance(lane.silhouette, cast.silhouette);
      const pd = paletteDistance(lane.palette, cast.palette);
      bestSilhouette = Math.min(bestSilhouette, sd);
      bestPalette = Math.min(bestPalette, pd);
      if (pd > thresholds.palette.maxCohesionDistance) flags.add("style-envelope-drift");
    }
    const cohesionScore = input.promotedCast.length === 0
      ? 1
      : Math.max(0, 1 - (bestPalette / thresholds.palette.maxCohesionDistance) * 0.5 - bestSilhouette * 0.5);
    return { laneIndex: lane.laneIndex, cohesionScore, flags: [...flags] };
  });
  return { lanes };
}
