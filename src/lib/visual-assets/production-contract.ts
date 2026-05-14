import {
  CHARACTER_OUTFIT_VARIANTS,
  CHARACTER_POSES,
  type CharacterFrame,
  type CharacterId,
  type CharacterMasterQuality,
  type CharacterMotionProfile,
  type CharacterOutfitVariant,
  type CharacterPose,
  type CharacterSafePadding,
  type VisualAsset,
  type VisualAssetId,
  type VisualAssetRenditions,
} from "./types";
import {
  SEASON_ONE_CHARACTER_METADATA,
  getCharacterVisualMetadata,
  type CharacterVisualMetadata,
} from "./characters";

export interface ExpectedCharacterSpriteSlot {
  id: VisualAssetId;
  characterId: CharacterId;
  character: CharacterVisualMetadata;
  outfitVariant: CharacterOutfitVariant;
  pose: CharacterPose;
  src: `/art/${string}/${CharacterId}/${CharacterOutfitVariant}/${CharacterPose}.webp`;
  width: number;
  height: number;
  masterQuality: CharacterMasterQuality;
  sourceFrame: CharacterFrame;
  displayFrame: CharacterFrame;
  safePadding: CharacterSafePadding;
  maxDisplayScale: number;
  artDirectionNotes: string;
  motionProfile: CharacterMotionProfile;
  renditions: VisualAssetRenditions;
  role: string;
  alt: string;
  promptRef: string;
}

export { CHARACTER_OUTFIT_VARIANTS, CHARACTER_POSES };

export function getCharacterProductionDirectory(characterId: CharacterId): `/art/${string}/${CharacterId}` {
  const character = getCharacterVisualMetadata(characterId);
  return `/art/${character.space}/${character.id}`;
}

export function getCharacterOutfitProductionDirectory(
  characterId: CharacterId,
  outfitVariant: CharacterOutfitVariant = "regular",
): `/art/${string}/${CharacterId}/${CharacterOutfitVariant}` {
  return `${getCharacterProductionDirectory(characterId)}/${outfitVariant}`;
}

export function getProductionSpriteSrc(
  characterId: CharacterId,
  pose: CharacterPose,
  outfitVariant: CharacterOutfitVariant = "regular",
): `/art/${string}/${CharacterId}/${CharacterOutfitVariant}/${CharacterPose}.webp` {
  return `${getCharacterOutfitProductionDirectory(characterId, outfitVariant)}/${pose}.webp`;
}

export function getProductionSpriteRenditions(
  characterId: CharacterId,
  pose: CharacterPose,
  outfitVariant: CharacterOutfitVariant = "regular",
): VisualAssetRenditions {
  const character = getCharacterVisualMetadata(characterId);
  const baseSrc = getProductionSpriteSrc(characterId, pose, outfitVariant);
  const baseWithoutExtension = baseSrc.replace(/\.webp$/, "");
  const { width, height } = character.displayFrame;

  return {
    default: {
      src: baseSrc,
      width,
      height,
    },
    retina2x: {
      src: `${baseWithoutExtension}@2x.webp`,
      width: width * 2,
      height: height * 2,
    },
    retina3x: {
      src: `${baseWithoutExtension}@3x.webp`,
      width: width * 3,
      height: height * 3,
    },
  };
}

export function getExpectedCharacterSpriteSlot(
  characterId: CharacterId,
  pose: CharacterPose,
  outfitVariant: CharacterOutfitVariant = "regular",
): ExpectedCharacterSpriteSlot {
  const character = getCharacterVisualMetadata(characterId);

  return {
    id: `${characterId}-${outfitVariant}-${pose}`,
    characterId,
    character,
    outfitVariant,
    pose,
    src: getProductionSpriteSrc(characterId, pose, outfitVariant),
    width: character.displayFrame.width,
    height: character.displayFrame.height,
    masterQuality: character.masterQuality,
    sourceFrame: character.sourceFrame,
    displayFrame: character.displayFrame,
    safePadding: character.safePadding,
    maxDisplayScale: character.maxDisplayScale,
    artDirectionNotes: character.artDirectionNotes,
    motionProfile: character.motionProfile,
    renditions: getProductionSpriteRenditions(characterId, pose, outfitVariant),
    role: `${character.displayName} ${outfitVariant} ${pose} production sprite`,
    alt: `${character.displayName}, ${character.title}, ${outfitVariant} outfit, ${pose} pose.`,
    promptRef: character.posePackPromptRef,
  };
}

export function getExpectedCharacterSpriteSlots(): ExpectedCharacterSpriteSlot[] {
  return SEASON_ONE_CHARACTER_METADATA.flatMap((character) =>
    CHARACTER_OUTFIT_VARIANTS.flatMap((outfitVariant) =>
      CHARACTER_POSES.map((pose) =>
        getExpectedCharacterSpriteSlot(character.id, pose, outfitVariant),
      ),
    ),
  );
}

export function toApprovedCharacterVisualAsset(
  slot: ExpectedCharacterSpriteSlot,
): VisualAsset {
  return {
    id: slot.id,
    kind: "character",
    src: slot.src,
    width: slot.width,
    height: slot.height,
    role: slot.role,
    approvalStatus: "approved",
    promptRef: slot.promptRef,
    alt: slot.alt,
    characterId: slot.characterId,
    outfitVariant: slot.outfitVariant,
    pose: slot.pose,
    masterQuality: slot.masterQuality,
    sourceFrame: slot.sourceFrame,
    displayFrame: slot.displayFrame,
    safePadding: slot.safePadding,
    maxDisplayScale: slot.maxDisplayScale,
    artDirectionNotes: slot.artDirectionNotes,
    motionProfile: slot.motionProfile,
    renditions: slot.renditions,
  };
}

export function getMissingApprovedCharacterSprites(
  assets: readonly VisualAsset[],
): ExpectedCharacterSpriteSlot[] {
  const approvedCharacterSrcs = new Set(
    assets
      .filter((asset) => asset.kind === "character" && asset.approvalStatus === "approved")
      .map((asset) => asset.src),
  );

  return getExpectedCharacterSpriteSlots().filter((slot) => !approvedCharacterSrcs.has(slot.src));
}
