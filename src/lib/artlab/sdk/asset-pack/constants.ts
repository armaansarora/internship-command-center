export const ARTLAB_ASSET_PACK_VERSION = "1.0.0" as const;
export type ArtLabAssetPackVersion = typeof ARTLAB_ASSET_PACK_VERSION;

export const ARTLAB_ASSET_KINDS = [
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
export type ArtLabAssetKind = (typeof ARTLAB_ASSET_KINDS)[number];

export const ARTLAB_AGENT_KINDS = [
  "character-master",
  "floor-environment",
  "ui-texture",
  "ui-icon",
  "sprite-animator",
  "motion-designer",
  "video-director",
  "sound-designer",
] as const;
export type ArtLabAgentKind = (typeof ARTLAB_AGENT_KINDS)[number];

export const ARTLAB_PACK_FILENAME = "manifest.json" as const;
export const ARTLAB_PACK_PAYLOAD_DIR = "payload" as const;
