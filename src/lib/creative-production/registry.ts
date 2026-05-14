import {
  CREATIVE_ASSET_TYPES,
  CREATIVE_EVERY_PHASE_GATES,
  type CreativeAssetType,
  type CreativeAssetTypeDefinition,
  type CreativePhaseDefinition,
  type CreativePhaseId,
} from "./types";

function titleCasePhase(id: CreativePhaseId): string {
  return id
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function phase(id: CreativePhaseId, owner: CreativePhaseDefinition["owner"]): CreativePhaseDefinition {
  return {
    id,
    label: titleCasePhase(id),
    owner,
    blocksPromotion: id !== "next-recommendation",
  };
}

const SHARED_PHASES: readonly CreativePhaseDefinition[] = [
  phase("orient", "agent"),
  phase("brainstorm", "agent"),
  phase("plan", "agent"),
  phase("concept-options", "agent"),
  phase("approval", "human"),
  phase("production-packet", "script"),
  phase("generation", "agent"),
  phase("ingest", "script"),
  phase("qa", "script"),
  phase("final-review", "human"),
  phase("promotion", "script"),
  phase("app-integration", "script"),
  phase("housekeeping", "script"),
  phase("continuous-improvement", "script"),
  phase("next-recommendation", "agent"),
];

const DEFINITIONS: Record<CreativeAssetType, CreativeAssetTypeDefinition> = {
  character: {
    id: "character",
    displayName: "Character",
    description: "Full cast members with identity, outfits, poses, motion profile, and app sprite integration.",
    outputRoot: ".artlab/studio/characters",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  environment: {
    id: "environment",
    displayName: "Environment",
    description: "Floor backgrounds, room views, lighting states, and responsive crops.",
    outputRoot: ".artlab/studio/environments",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  prop: {
    id: "prop",
    displayName: "Prop",
    description: "Transparent objects such as bells, folders, pens, cards, dossiers, devices, and desk items.",
    outputRoot: ".artlab/studio/props",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  "ui-texture": {
    id: "ui-texture",
    displayName: "UI Texture",
    description: "Approved raster surfaces, subtle material textures, dividers, and panel treatments.",
    outputRoot: ".artlab/studio/ui-textures",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  animation: {
    id: "animation",
    displayName: "Animation",
    description: "Motion loops, sprite-state motion, transition treatments, and ambient movement specs.",
    outputRoot: ".artlab/studio/animations",
    productionRoot: "public/art",
    manifestStrategy: "runtime-motion",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  scene: {
    id: "scene",
    displayName: "Scene",
    description: "Composed Tower moments such as onboarding, executive briefings, and floor cutscenes.",
    outputRoot: ".artlab/studio/scenes",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  "icon-system": {
    id: "icon-system",
    displayName: "Icon System",
    description: "Approved custom raster symbols only when lucide or existing UI symbols are insufficient.",
    outputRoot: ".artlab/studio/icon-system",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
  "marketing-hero": {
    id: "marketing-hero",
    displayName: "Marketing Hero",
    description: "Public-facing Tower hero, venue, product, and promotional imagery.",
    outputRoot: ".artlab/studio/marketing-hero",
    productionRoot: "public/art",
    manifestStrategy: "visual-assets",
    phases: SHARED_PHASES,
    requiredEveryPhaseGates: CREATIVE_EVERY_PHASE_GATES,
  },
};

export { CREATIVE_ASSET_TYPES, CREATIVE_PHASES } from "./types";

export function getCreativeAssetTypeDefinition(assetType: CreativeAssetType): CreativeAssetTypeDefinition {
  return DEFINITIONS[assetType];
}

export function listCreativeAssetTypeDefinitions(): CreativeAssetTypeDefinition[] {
  return CREATIVE_ASSET_TYPES.map((assetType) => DEFINITIONS[assetType]);
}
