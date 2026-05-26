import { readFile, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { sha256OfBytes } from "./hashing";
import { ARTLAB_PACK_FILENAME, ARTLAB_PACK_PAYLOAD_DIR } from "./constants";
import { ArtLabAssetPackManifestSchema, type ArtLabAssetPackManifest } from "./manifest.schema";

export interface LoadedArtLabAssetPack {
  packId: string;
  /** Absolute path to the pack directory (containing `manifest.json` + `payload/`). */
  packDir: string;
  manifest: ArtLabAssetPackManifest;
}

/**
 * Validate that `packId` is safe to use as a directory name under `packsRoot`.
 *
 * The pack id ends up joined to `packsRoot` to form a filesystem path. A
 * traversal-bearing id (`..`, leading `/`, NUL, backslash, drive prefix,
 * percent-encoded segments) could escape the packs root and load arbitrary
 * manifests, so we reject any non-canonical or non-relative form before
 * touching the disk.
 */
function assertSafePackId(packId: string): void {
  if (packId.length === 0) {
    throw new Error("loadArtLabAssetPack: pack id must not be empty");
  }
  if (packId.includes("\0")) {
    throw new Error(`loadArtLabAssetPack: pack id contains NUL byte: ${JSON.stringify(packId)}`);
  }
  if (packId.includes("\\")) {
    throw new Error(`loadArtLabAssetPack: pack id must not contain backslash: ${JSON.stringify(packId)}`);
  }
  if (/%[0-9a-fA-F]{2}/.test(packId)) {
    throw new Error(`loadArtLabAssetPack: pack id must not contain percent-encoded sequences: ${JSON.stringify(packId)}`);
  }
  if (packId.startsWith("/") || packId.startsWith("~") || /^[a-zA-Z]:/.test(packId)) {
    throw new Error(`loadArtLabAssetPack: pack id must be a relative directory name (got ${JSON.stringify(packId)})`);
  }
  if (packId.split(/[\\/]/).some((segment) => segment === "..")) {
    throw new Error(`loadArtLabAssetPack: pack id may not contain '..' segments: ${JSON.stringify(packId)}`);
  }
}

/**
 * Load a promoted ArtLab SDK asset pack by id.
 *
 * Reads `<packsRoot>/<packId>/manifest.json`, validates it against the
 * strict `ArtLabAssetPackManifestSchema`, and returns the parsed manifest
 * together with the absolute pack directory. Consumers (notably
 * `resolveArtLabSpriteSourcePack`) resolve payload-relative paths against
 * `packDir`.
 *
 * Behaviour:
 *   - returns `null` when the pack directory does not exist
 *   - throws with an actionable reason when the directory exists but the
 *     manifest is missing, malformed JSON, or fails schema validation
 *   - throws when `packId` is unsafe (traversal, NUL byte, absolute path)
 *
 * Critical 2 fix: replaces the prior `return null` stub.
 */
export async function loadArtLabAssetPack(
  packsRoot: string,
  packId: string,
): Promise<LoadedArtLabAssetPack | null> {
  assertSafePackId(packId);
  // Defence-in-depth: even though assertSafePackId rejects the obvious
  // attack vectors, verify that the joined path is rooted under packsRoot.
  const packsRootResolved = resolve(packsRoot);
  const packDir = resolve(join(packsRootResolved, packId));
  const packsRootPrefix = packsRootResolved + sep;
  if (!(packDir === packsRootResolved || packDir.startsWith(packsRootPrefix))) {
    throw new Error(
      `loadArtLabAssetPack: pack id ${JSON.stringify(packId)} resolved outside packsRoot ${JSON.stringify(packsRoot)}`,
    );
  }
  let packStat;
  try {
    packStat = await stat(packDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
  if (!packStat.isDirectory()) {
    throw new Error(`loadArtLabAssetPack: pack path is not a directory: ${packDir}`);
  }
  const manifestPath = join(packDir, ARTLAB_PACK_FILENAME);
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `loadArtLabAssetPack: manifest.json missing at ${manifestPath} (pack id ${JSON.stringify(packId)})`,
      );
    }
    throw err;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `loadArtLabAssetPack: manifest.json at ${manifestPath} is not valid JSON: ${(err as Error).message}`,
    );
  }
  const parsed = ArtLabAssetPackManifestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(
      `loadArtLabAssetPack: manifest at ${manifestPath} failed strict schema validation: ${parsed.error.message}`,
    );
  }
  return { packId, packDir, manifest: parsed.data };
}

export type ReadArtLabAssetPackResult =
  | { ok: true; manifest: ArtLabAssetPackManifest; payloadBytes: Record<string, Buffer>; packDir: string }
  | { ok: false; code: "manifest-missing" | "manifest-invalid" | "payload-missing" | "payload-sha256-mismatch"; message: string; packDir: string };

export async function readArtLabAssetPack(packDir: string): Promise<ReadArtLabAssetPackResult> {
  const manifestPath = join(packDir, ARTLAB_PACK_FILENAME);
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    return { ok: false, code: "manifest-missing", message: `no manifest.json at ${manifestPath}`, packDir };
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    return { ok: false, code: "manifest-invalid", message: `manifest.json is not valid JSON: ${(err as Error).message}`, packDir };
  }
  const parsed = ArtLabAssetPackManifestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { ok: false, code: "manifest-invalid", message: parsed.error.message, packDir };
  }
  const manifest = parsed.data;
  const payloadBytes: Record<string, Buffer> = {};
  for (const f of manifest.payload.files) {
    const abs = join(packDir, ARTLAB_PACK_PAYLOAD_DIR, f.relPath);
    let bytes: Buffer;
    try {
      bytes = await readFile(abs);
    } catch {
      return { ok: false, code: "payload-missing", message: `payload file missing: ${abs}`, packDir };
    }
    const actual = sha256OfBytes(bytes);
    if (actual !== f.sha256) {
      return {
        ok: false,
        code: "payload-sha256-mismatch",
        message: `sha256 mismatch for ${f.relPath}: expected ${f.sha256}, got ${actual}`,
        packDir,
      };
    }
    payloadBytes[f.relPath] = bytes;
  }
  return { ok: true, manifest, payloadBytes, packDir };
}
