import { CREATIVE_ASSET_TYPES, type CreativeAssetType } from "./types";
import { createDefaultCreativeStudioState, type CreativeStudioState } from "./state";

export interface CreativeStudioOrientation {
  openingQuestion: "What are we adding to The Tower today?";
  soFar: string;
  recommendation: string;
  remaining: string;
  warnings: string;
  availableAssetTypes: readonly CreativeAssetType[];
}

export function buildCreativeStudioOrientation(
  state: CreativeStudioState = createDefaultCreativeStudioState(),
): CreativeStudioOrientation {
  return {
    openingQuestion: "What are we adding to The Tower today?",
    soFar: `So far we have done: ${state.done.join("; ")}.`,
    recommendation: `I suggest we do ${state.recommendedNext.name} now because ${state.recommendedNext.reason}`,
    remaining: `Still remaining: ${state.remaining.join("; ")}.`,
    warnings: `Known warnings: ${state.knownWarnings.length ? state.knownWarnings.join("; ") : "none"}.`,
    availableAssetTypes: CREATIVE_ASSET_TYPES,
  };
}
