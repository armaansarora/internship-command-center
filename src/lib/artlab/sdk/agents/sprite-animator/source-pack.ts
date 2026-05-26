import { join } from "node:path";
import {
  ARTLAB_PACK_PAYLOAD_DIR,
  loadArtLabAssetPack,
} from "@/lib/artlab/sdk/asset-pack";

export interface ArtLabSpriteSource {
  packId: string;
  characterId: string;
  /** Absolute path to the anchor sprite inside the pack's payload directory. */
  anchorImagePath: string;
  anchorPerceptualHash: string;
}

export interface ResolveArtLabSpriteSourcePackContext {
  /**
   * Root directory under which promoted character packs live (one
   * subdirectory per packId). `loadArtLabAssetPack` joins this with the
   * pack id, reads `<packDir>/manifest.json`, and validates via the strict
   * ArtLab asset pack schema.
   */
  packsRoot: string;
}

/**
 * Critical 1 alignment: resolve a promoted character pack into the source
 * fields the sprite-animator agent feeds to its video/Lottie providers and
 * its identity QA gates. The resolver:
 *
 *   1. loads the pack via the strict `loadArtLabAssetPack` reader (no
 *      manifest shape adaptation — both sides honour the schema);
 *   2. asserts the pack's `kind` is `character-spritesheet` (the only
 *      sprite-animator-compatible source kind today);
 *   3. extracts the canonical `characterId` from `canonRefs`;
 *   4. resolves the pack-relative `anchorImageRelPath` against the pack's
 *      payload directory so callers receive an absolute filesystem path.
 *
 * Schema validation already guarantees `anchorImageRelPath` and
 * `anchorPerceptualHash` are present for any `character-spritesheet` pack
 * (see manifest.schema.ts `superRefine`), so a real character pack written
 * by `character-master` now flows through cleanly — no more fixture-only
 * mocking required to satisfy the contract.
 */
export async function resolveArtLabSpriteSourcePack(
  packId: string,
  context: ResolveArtLabSpriteSourcePackContext,
): Promise<ArtLabSpriteSource> {
  const pack = await loadArtLabAssetPack(context.packsRoot, packId);
  if (!pack) {
    throw new Error(
      `artlab/sprite-animator: source pack ${packId} not found under ${context.packsRoot}`,
    );
  }
  const { manifest, packDir } = pack;
  if (manifest.kind !== "character-spritesheet") {
    throw new Error(
      `artlab/sprite-animator: source pack ${packId} must be a character-spritesheet (got kind=${manifest.kind})`,
    );
  }
  const characterId = manifest.canonRefs.characterId;
  if (typeof characterId !== "string" || characterId.length === 0) {
    throw new Error(
      `artlab/sprite-animator: source pack ${packId} character-spritesheet must declare canonRefs.characterId`,
    );
  }
  // Schema refinement guarantees these are present + well-formed for
  // character-spritesheet kinds, but we narrow the optional manifest types
  // here so the return type stays strict (no nullable strings).
  const anchorRelPath = manifest.anchorImageRelPath;
  const anchorPerceptualHash = manifest.anchorPerceptualHash;
  if (typeof anchorRelPath !== "string" || anchorRelPath.length === 0) {
    throw new Error(
      `artlab/sprite-animator: source pack ${packId} missing anchorImageRelPath`,
    );
  }
  if (
    typeof anchorPerceptualHash !== "string" ||
    !/^[0-9a-f]{16}$/.test(anchorPerceptualHash)
  ) {
    throw new Error(
      `artlab/sprite-animator: source pack ${packId} missing or malformed anchorPerceptualHash`,
    );
  }
  return {
    packId,
    characterId,
    anchorImagePath: join(packDir, ARTLAB_PACK_PAYLOAD_DIR, anchorRelPath),
    anchorPerceptualHash,
  };
}
