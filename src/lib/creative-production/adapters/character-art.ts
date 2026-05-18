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
    completed: [],
    recommendedNext: "Otis Vale from-scratch initial design, then full production pack after approval",
    commandHints: ["npm run art:operate", "npm run art:status"],
    warningCodes: [],
  };
}
