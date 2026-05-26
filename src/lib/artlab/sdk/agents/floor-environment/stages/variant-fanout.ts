import { buildArtLabFloorCompositionPrompt } from "./composition-prompt";
import type { ArtLabFloorCanonEntry } from "../floor-canon";
import type { ArtLabFloorTimeState } from "../types";

export interface ArtLabFloorVariantJob {
  jobId: string;
  floorSlug: string;
  timeState: ArtLabFloorTimeState;
  prompt: string;
  aspectRatio: ArtLabFloorCanonEntry["aspectRatio"];
}

export function fanOutArtLabFloorVariants(
  canon: ArtLabFloorCanonEntry,
  timeStates: ReadonlyArray<ArtLabFloorTimeState>,
): ArtLabFloorVariantJob[] {
  return timeStates.map((timeState) => ({
    jobId: `${canon.slug}-${timeState}`,
    floorSlug: canon.slug,
    timeState,
    prompt: buildArtLabFloorCompositionPrompt(canon, timeState),
    aspectRatio: canon.aspectRatio,
  }));
}
