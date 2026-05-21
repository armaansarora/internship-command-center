import { paletteDistance, silhouetteDistance, type PaletteHistogram, type SilhouetteHash } from "./hashes";
import { loadCoherenceThresholds } from "./thresholds";

export interface LaneSignature {
  laneIndex: number;
  silhouette: SilhouetteHash;
  palette: PaletteHistogram;
  ageImpression: number;
}

export interface PromotedCastSignature {
  characterId: string;
  silhouette: SilhouetteHash;
  palette: PaletteHistogram;
  ageImpression: number;
}

export type CoherenceFailureCode = "diversity-failure" | "cohesion-drift" | "style-envelope-drift" | "age-impression-drift";

export interface CastDiversityResult {
  passed: boolean;
  failureCodes: CoherenceFailureCode[];
  pairwiseSilhouette: number[];
  pairwisePalette: number[];
}

export function checkCastDiversity(input: { lanes: LaneSignature[]; promotedCast: PromotedCastSignature[] }): CastDiversityResult {
  const thresholds = loadCoherenceThresholds();
  const failureCodes = new Set<CoherenceFailureCode>();
  const pairwiseSilhouette: number[] = [];
  const pairwisePalette: number[] = [];

  for (let i = 0; i < input.lanes.length; i += 1) {
    for (let j = i + 1; j < input.lanes.length; j += 1) {
      const sd = silhouetteDistance(input.lanes[i]!.silhouette, input.lanes[j]!.silhouette);
      const pd = paletteDistance(input.lanes[i]!.palette, input.lanes[j]!.palette);
      pairwiseSilhouette.push(sd);
      pairwisePalette.push(pd);
      if (sd < thresholds.silhouette.minPairwiseDistance && pd < thresholds.palette.minPairwiseDistance) {
        failureCodes.add("diversity-failure");
      }
    }
  }

  for (const lane of input.lanes) {
    for (const cast of input.promotedCast) {
      const sd = silhouetteDistance(lane.silhouette, cast.silhouette);
      const pd = paletteDistance(lane.palette, cast.palette);
      if (sd < thresholds.silhouette.minPairwiseDistance / 2 && pd < thresholds.palette.minPairwiseDistance / 2) {
        failureCodes.add("cohesion-drift");
      }
      if (pd > thresholds.palette.maxCohesionDistance && sd > thresholds.silhouette.maxCohesionDistance) {
        failureCodes.add("style-envelope-drift");
      }
      if (Math.abs(lane.ageImpression - cast.ageImpression) > thresholds.age.maxImpressionGapYears) {
        failureCodes.add("age-impression-drift");
      }
    }
  }

  return {
    passed: failureCodes.size === 0,
    failureCodes: [...failureCodes],
    pairwiseSilhouette,
    pairwisePalette,
  };
}
