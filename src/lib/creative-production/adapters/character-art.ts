export interface CharacterCreativeAdapterSummary {
  assetType: "character";
  completed: string[];
  recommendedNext: string;
  commandHints: string[];
  warningCodes: string[];
}

export function buildCharacterCreativeAdapterSummary(): CharacterCreativeAdapterSummary {
  return {
    assetType: "character",
    completed: ["Otis Vale"],
    recommendedNext: "Mara Voss",
    commandHints: ["npm run art:operate", "npm run art:status"],
    warningCodes: ["source-long-edge-below-4096", "source-upscaled-to-master"],
  };
}
