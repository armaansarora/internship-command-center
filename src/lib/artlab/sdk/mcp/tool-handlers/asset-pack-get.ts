import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import {
  ArtLabAssetPackGetInputSchema,
  ArtLabAssetPackGetOutputSchema,
  type ArtLabAssetPackGetOutput,
} from "../tools";
import {
  PackIdSchema,
  resolvePackDir,
  assertPathSafeAgainstTraversal,
} from "../lib/path-safety";
import type { ArtLabAssetPackListContext } from "./asset-pack-list";

interface ManifestFile {
  path: string;
  role: string;
}
interface MinimalManifest {
  packId: string;
  files: ManifestFile[];
}

export async function handleArtLabAssetPackGet(
  rawInput: unknown,
  ctx: ArtLabAssetPackListContext,
): Promise<ArtLabAssetPackGetOutput> {
  const input = ArtLabAssetPackGetInputSchema.parse(rawInput);
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
  const files: ArtLabAssetPackGetOutput["files"] = [];
  for (const f of manifest.files) {
    // Manifest-author-controlled paths are also confined to packDir so a
    // poisoned manifest cannot read outside its own asset pack.
    const abs = resolveWithinPack(packDir, f.path);
    if (!existsSync(abs)) {
      throw new Error(`asset pack file missing on disk: ${abs}`);
    }
    files.push({ path: abs, role: f.role, bytes: statSync(abs).size });
  }
  return ArtLabAssetPackGetOutputSchema.parse({
    packId: safePackId,
    manifest: manifest as Record<string, unknown>,
    files,
  });
}

/**
 * Resolve a relative manifest entry inside `packDir`, refusing escapes.
 *
 * The hand-rolled check this replaced missed encoded traversal (`..%2f`),
 * backslashes, NUL bytes, and tilde — vectors that `PackIdSchema` already
 * rejects at the packId layer but had no equivalent inside the manifest.
 * `assertPathSafeAgainstTraversal` is the shared helper used everywhere a
 * relative path arrives from an untrusted manifest.
 *
 * After the helper passes we also belt-and-suspenders re-confirm the
 * resolved absolute path stays under `packDir` (handles edge cases like a
 * filesystem that follows symlinks or a future feature that swaps the
 * helper for a softer rule).
 */
function resolveWithinPack(packDir: string, relPath: string): string {
  assertPathSafeAgainstTraversal(relPath, "manifest files[].path");
  const candidate = resolve(packDir, relPath);
  const packDirAbs = resolve(packDir);
  const withSep = packDirAbs.endsWith(sep) ? packDirAbs : `${packDirAbs}${sep}`;
  if (candidate !== packDirAbs && !candidate.startsWith(withSep)) {
    throw new Error(
      `manifest files[].path '${relPath}' resolves outside packDir (${candidate} not under ${packDirAbs})`,
    );
  }
  return candidate;
}
