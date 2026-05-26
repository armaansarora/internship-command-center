import {
  ArtLabAssetPackManifestSchema,
  type ArtLabAssetPackManifest,
} from "./manifest.schema";

export interface BuiltArtLabAssetPack {
  packId: string;
  manifest: ArtLabAssetPackManifest;
}

/**
 * Build a ArtLab asset pack envelope from a manifest object.
 *
 * SECURITY: This is a public, re-exported entry point. We MUST validate the
 * input through `ArtLabAssetPackManifestSchema` to refuse manifests with bad
 * sha256 hashes, path-traversal `appPath` values, missing canon refs, or any
 * extra/unknown properties (`.strict()`). Downstream consumers (`read.ts`,
 * `pack.ts`) trust the typed result.
 */
export async function buildArtLabAssetPack(
  manifest: Record<string, unknown>,
): Promise<BuiltArtLabAssetPack> {
  const parsed = ArtLabAssetPackManifestSchema.parse(manifest);
  return { packId: parsed.packId, manifest: parsed };
}
