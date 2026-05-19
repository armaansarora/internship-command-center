export const CREATIVE_ASSET_TYPES = [
  "character",
  "environment",
  "prop",
  "ui-texture",
  "animation",
  "scene",
  "icon-system",
  "marketing-hero",
  "shader",
] as const;

export const CREATIVE_PHASES = [
  "orient",
  "brainstorm",
  "plan",
  "concept-options",
  "approval",
  "production-packet",
  "generation",
  "ingest",
  "qa",
  "final-review",
  "promotion",
  "app-integration",
  "housekeeping",
  "continuous-improvement",
  "next-recommendation",
] as const;

export const CREATIVE_EVERY_PHASE_GATES = [
  "housekeeping",
  "continuous-improvement",
] as const;

export type CreativeAssetType = (typeof CREATIVE_ASSET_TYPES)[number];
export type CreativePhaseId = (typeof CREATIVE_PHASES)[number];
export type CreativeEveryPhaseGate = (typeof CREATIVE_EVERY_PHASE_GATES)[number];

export interface CreativePhaseDefinition {
  id: CreativePhaseId;
  label: string;
  owner: "agent" | "script" | "human";
  blocksPromotion: boolean;
}

export interface CreativeAssetTypeDefinition {
  id: CreativeAssetType;
  displayName: string;
  description: string;
  outputRoot: `.artlab/studio/${string}`;
  productionRoot: `public/${string}`;
  manifestStrategy: "visual-assets" | "runtime-motion" | "documented-only";
  phases: readonly CreativePhaseDefinition[];
  requiredEveryPhaseGates: readonly CreativeEveryPhaseGate[];
}
