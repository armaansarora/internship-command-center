import type {
  CharacterId,
  CharacterOutfitVariant,
  CharacterPose,
  VisualAsset,
  VisualAssetId,
} from "./types";
import approvedCharacterAssetsJson from "./approved-character-assets.generated.json";

export const LOBBY_BACKGROUND_ASSET_IDS = [
  "lobby-background-1",
  "lobby-background-2",
  "lobby-background-3",
  "lobby-background-4",
] as const satisfies readonly VisualAssetId[];

const APPROVED_CHARACTER_ASSETS = approvedCharacterAssetsJson as VisualAsset[];

export const VISUAL_ASSETS: readonly VisualAsset[] = [
  {
    id: "lobby-background-1",
    kind: "environment",
    src: "/lobby/bg-1.jpg",
    width: 1920,
    height: 1280,
    role: "Lobby rotating background plate",
    approvalStatus: "approved",
    promptRef: "art-bible:lobby-existing-backgrounds",
    alt: "",
  },
  {
    id: "lobby-background-2",
    kind: "environment",
    src: "/lobby/bg-2.jpg",
    width: 1920,
    height: 1280,
    role: "Lobby rotating background plate",
    approvalStatus: "approved",
    promptRef: "art-bible:lobby-existing-backgrounds",
    alt: "",
  },
  {
    id: "lobby-background-3",
    kind: "environment",
    src: "/lobby/bg-3.jpg",
    width: 1920,
    height: 1280,
    role: "Lobby rotating background plate",
    approvalStatus: "approved",
    promptRef: "art-bible:lobby-existing-backgrounds",
    alt: "",
  },
  {
    id: "lobby-background-4",
    kind: "environment",
    src: "/lobby/bg-4.jpg",
    width: 1920,
    height: 1280,
    role: "Lobby rotating background plate",
    approvalStatus: "approved",
    promptRef: "art-bible:lobby-existing-backgrounds",
    alt: "",
  },
  ...APPROVED_CHARACTER_ASSETS,
];

const ASSET_BY_ID = new Map<VisualAssetId, VisualAsset>(
  VISUAL_ASSETS.map((asset) => [asset.id, asset]),
);

export function getVisualAsset(id: VisualAssetId): VisualAsset | undefined {
  return ASSET_BY_ID.get(id);
}

export function getCharacterAsset(
  characterId: CharacterId,
  pose: CharacterPose,
  outfitVariant: CharacterOutfitVariant = "regular",
): VisualAsset | undefined {
  return VISUAL_ASSETS.find(
    (asset) =>
      asset.characterId === characterId &&
      asset.pose === pose &&
      asset.outfitVariant === outfitVariant,
  );
}
