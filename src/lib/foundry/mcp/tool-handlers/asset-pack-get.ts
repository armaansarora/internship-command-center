import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  FoundryAssetPackGetInputSchema,
  FoundryAssetPackGetOutputSchema,
  type FoundryAssetPackGetOutput,
} from "../tools";
import { PackIdSchema, resolvePackDir } from "../lib/path-safety";
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
  // Defense in depth: validate packId charset/encoding before any path join,
  // then re-confirm the resolved directory stays inside packsRoot.
  const safePackId = PackIdSchema.parse(input.packId);
  const packDir = resolvePackDir(ctx.packsRoot, safePackId);
  const manifestPath = join(packDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`asset pack not found: ${safePackId}`);
  }
  const manifestRaw = readFileSync(manifestPath, "utf8");
  let manifest: MinimalManifest & Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestRaw) as MinimalManifest & Record<string, unknown>;
  } catch (err) {
    throw new Error(`asset pack manifest malformed at ${manifestPath}: ${String(err)}`);
  }
  if (!Array.isArray(manifest.files)) {
    throw new Error(`asset pack manifest missing 'files' array: ${safePackId}`);
  }
  const files: FoundryAssetPackGetOutput["files"] = [];
  for (const f of manifest.files) {
    // Manifest-author-controlled paths are also confined to packDir so a
    // poisoned manifest cannot read outside its own asset pack.
    const abs = resolveWithinPack(packDir, f.path);
    if (!existsSync(abs)) {
      throw new Error(`asset pack file missing on disk: ${abs}`);
    }
    files.push({ path: abs, role: f.role, bytes: statSync(abs).size });
  }
  return FoundryAssetPackGetOutputSchema.parse({
    packId: safePackId,
    manifest: manifest as Record<string, unknown>,
    files,
  });
}

/** Resolve a relative manifest entry inside `packDir`, refusing escapes. */
function resolveWithinPack(packDir: string, relPath: string): string {
  if (relPath.includes("..") || relPath.startsWith("/") || relPath.startsWith("~")) {
    throw new Error(`manifest file path '${relPath}' is not safe`);
  }
  return join(packDir, relPath);
}
