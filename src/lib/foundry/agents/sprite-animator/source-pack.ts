import { loadFoundryAssetPack } from "@/lib/foundry/asset-pack";

export interface FoundrySpriteSource {
  packId: string;
  characterId: string;
  anchorImagePath: string;
  anchorPerceptualHash: string;
}

export async function resolveFoundrySpriteSourcePack(
  packId: string,
): Promise<FoundrySpriteSource> {
  const pack = await loadFoundryAssetPack(packId);
  if (!pack) {
    throw new Error(`foundry/sprite-animator: source pack ${packId} not found`);
  }
  const manifest = pack.manifest as Record<string, unknown>;
  if (manifest.assetKind !== "character") {
    throw new Error(
      `foundry/sprite-animator: source pack ${packId} must be a character (got assetKind=${String(manifest.assetKind)})`,
    );
  }
  const characterId = manifest.characterId;
  const anchorImagePath = manifest.anchorImagePath;
  const anchorPerceptualHash = manifest.anchorPerceptualHash;
  if (typeof characterId !== "string" || characterId.length === 0) {
    throw new Error(
      `foundry/sprite-animator: source pack ${packId} missing characterId`,
    );
  }
  if (typeof anchorImagePath !== "string" || anchorImagePath.length === 0) {
    throw new Error(
      `foundry/sprite-animator: source pack ${packId} missing anchorImagePath`,
    );
  }
  if (
    typeof anchorPerceptualHash !== "string" ||
    !/^[0-9a-f]{16}$/.test(anchorPerceptualHash)
  ) {
    throw new Error(
      `foundry/sprite-animator: source pack ${packId} missing or malformed anchorPerceptualHash`,
    );
  }
  return {
    packId,
    characterId,
    anchorImagePath,
    anchorPerceptualHash,
  };
}
