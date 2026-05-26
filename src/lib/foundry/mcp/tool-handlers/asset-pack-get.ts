import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  FoundryAssetPackGetInputSchema,
  FoundryAssetPackGetOutputSchema,
  type FoundryAssetPackGetOutput,
} from "../tools";
import type { FoundryAssetPackListContext } from "./asset-pack-list";

interface ManifestFile {
  path: string;
  role: string;
}
interface MinimalManifest {
  packId: string;
  files: ManifestFile[];
}

export async function handleFoundryAssetPackGet(
  rawInput: unknown,
  ctx: FoundryAssetPackListContext,
): Promise<FoundryAssetPackGetOutput> {
  const input = FoundryAssetPackGetInputSchema.parse(rawInput);
  const packDir = join(ctx.packsRoot, input.packId);
  const manifestPath = join(packDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`asset pack not found: ${input.packId}`);
  }
  const manifestRaw = readFileSync(manifestPath, "utf8");
  let manifest: MinimalManifest & Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestRaw) as MinimalManifest & Record<string, unknown>;
  } catch (err) {
    throw new Error(`asset pack manifest malformed at ${manifestPath}: ${String(err)}`);
  }
  if (!Array.isArray(manifest.files)) {
    throw new Error(`asset pack manifest missing 'files' array: ${input.packId}`);
  }
  const files: FoundryAssetPackGetOutput["files"] = [];
  for (const f of manifest.files) {
    const abs = join(packDir, f.path);
    if (!existsSync(abs)) {
      throw new Error(`asset pack file missing on disk: ${abs}`);
    }
    files.push({ path: abs, role: f.role, bytes: statSync(abs).size });
  }
  return FoundryAssetPackGetOutputSchema.parse({
    packId: input.packId,
    manifest: manifest as Record<string, unknown>,
    files,
  });
}
