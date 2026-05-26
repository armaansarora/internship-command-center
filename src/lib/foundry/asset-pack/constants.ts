export const FOUNDRY_ASSET_PACK_VERSION = "1.0.0" as const;
export type FoundryAssetPackVersion = typeof FOUNDRY_ASSET_PACK_VERSION;

export const FOUNDRY_ASSET_KINDS = [
  "character-sprite",
  "character-spritesheet",
  "floor-environment",
  "ui-texture",
  "ui-icon",
  "sprite-animation",
  "motion-design",
  "video",
  "sound",
] as const;
export type FoundryAssetKind = (typeof FOUNDRY_ASSET_KINDS)[number];

export const FOUNDRY_AGENT_KINDS = [
  "character-master",
  "floor-environment",
  "ui-texture",
  "ui-icon",
  "sprite-animator",
  "motion-designer",
  "video-director",
  "sound-designer",
] as const;
export type FoundryAgentKind = (typeof FOUNDRY_AGENT_KINDS)[number];

export const FOUNDRY_PACK_FILENAME = "manifest.json" as const;
export const FOUNDRY_PACK_PAYLOAD_DIR = "payload" as const;
