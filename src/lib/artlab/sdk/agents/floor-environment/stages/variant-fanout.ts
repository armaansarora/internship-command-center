import { buildFoundryFloorCompositionPrompt } from "./composition-prompt";
import type { FoundryFloorCanonEntry } from "../floor-canon";
import type { FoundryFloorTimeState } from "../types";

export interface FoundryFloorVariantJob {
  jobId: string;
  floorSlug: string;
  timeState: FoundryFloorTimeState;
  prompt: string;
  aspectRatio: FoundryFloorCanonEntry["aspectRatio"];
}

export function fanOutFoundryFloorVariants(
  canon: FoundryFloorCanonEntry,
  timeStates: ReadonlyArray<FoundryFloorTimeState>,
): FoundryFloorVariantJob[] {
  return timeStates.map((timeState) => ({
    jobId: `${canon.slug}-${timeState}`,
    floorSlug: canon.slug,
    timeState,
    prompt: buildFoundryFloorCompositionPrompt(canon, timeState),
    aspectRatio: canon.aspectRatio,
  }));
}
