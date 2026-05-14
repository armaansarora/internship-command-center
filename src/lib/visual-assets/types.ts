export type VisualAssetKind = "environment" | "character" | "prop" | "texture";

export const CHARACTER_POSES = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "talking",
  "alert",
  "working",
] as const;

export const CHARACTER_OUTFIT_VARIANTS = [
  "regular",
  "summer-light",
  "winter-layered",
] as const;

export type CharacterId =
  | "otis"
  | "ceo"
  | "cio"
  | "cfo"
  | "cmo"
  | "cno"
  | "coo"
  | "cpo"
  | "cro"
  | "trust"
  | "archivist"
  | "red-team";

export type CharacterPose = (typeof CHARACTER_POSES)[number];
export type CharacterOutfitVariant = (typeof CHARACTER_OUTFIT_VARIANTS)[number];
export type CharacterMasterQuality = "4k-source-approved";
export type CharacterMotionProfile =
  | "concierge-calm"
  | "executive-still"
  | "war-room-kinetic"
  | "analytical-precise"
  | "operations-brisk"
  | "editorial-poised"
  | "networking-warm"
  | "prep-focused"
  | "research-watchful"
  | "trust-still"
  | "archive-kinetic"
  | "red-team-controlled";

export type VisualAssetId =
  | "lobby-background-1"
  | "lobby-background-2"
  | "lobby-background-3"
  | "lobby-background-4"
  | `${CharacterId}-${CharacterOutfitVariant}-${CharacterPose}`;

export interface CharacterFrame {
  width: number;
  height: number;
}

export interface CharacterSafePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface VisualAssetRendition {
  src: string;
  width: number;
  height: number;
}

export interface VisualAssetRenditions {
  default: VisualAssetRendition;
  retina2x: VisualAssetRendition;
  retina3x: VisualAssetRendition;
}

export interface VisualAsset {
  id: VisualAssetId;
  kind: VisualAssetKind;
  src: string;
  width: number;
  height: number;
  role: string;
  approvalStatus: "approved";
  promptRef: string;
  alt: string;
  characterId?: CharacterId;
  outfitVariant?: CharacterOutfitVariant;
  pose?: CharacterPose;
  masterQuality?: CharacterMasterQuality;
  sourceFrame?: CharacterFrame;
  displayFrame?: CharacterFrame;
  safePadding?: CharacterSafePadding;
  maxDisplayScale?: number;
  artDirectionNotes?: string;
  motionProfile?: CharacterMotionProfile;
  renditions?: VisualAssetRenditions;
  sourceRunId?: string;
  assetVersion?: string;
  checksum?: string;
  sourceResolution?: CharacterFrame;
  masterResolution?: CharacterFrame;
  qaStatus?: "passed";
  promotionDate?: string;
}
