import {
  FoundryAssetPackManifestSchema,
  type FoundryAssetPackManifest,
} from "./manifest.schema";

export interface BuiltFoundryAssetPack {
  packId: string;
  manifest: FoundryAssetPackManifest;
}

/**
 * Build a Foundry asset pack envelope from a manifest object.
 *
 * SECURITY: This is a public, re-exported entry point. We MUST validate the
 * input through `FoundryAssetPackManifestSchema` to refuse manifests with bad
 * sha256 hashes, path-traversal `appPath` values, missing canon refs, or any
 * extra/unknown properties (`.strict()`). Downstream consumers (`read.ts`,
 * `pack.ts`) trust the typed result.
 */
export async function buildFoundryAssetPack(
  manifest: Record<string, unknown>,
): Promise<BuiltFoundryAssetPack> {
  const parsed = FoundryAssetPackManifestSchema.parse(manifest);
  return { packId: parsed.packId, manifest: parsed };
}
