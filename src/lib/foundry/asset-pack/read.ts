import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256OfBytes } from "./hashing";
import { FOUNDRY_PACK_FILENAME, FOUNDRY_PACK_PAYLOAD_DIR } from "./constants";
import { FoundryAssetPackManifestSchema, type FoundryAssetPackManifest } from "./manifest.schema";

export interface LoadedFoundryAssetPack {
  packId: string;
  manifest: FoundryAssetPackManifest | Record<string, unknown>;
}

/**
 * Load a registered foundry asset pack by id.
 *
 * This is a stub for sprite-animator and other consumers that need to
 * resolve a previously emitted pack by id (e.g. `char-otis-v3`). A real
 * implementation will live in a registry module; tests mock this symbol.
 */
export async function loadFoundryAssetPack(
  _packId: string,
): Promise<LoadedFoundryAssetPack | null> {
  return null;
}

export type ReadFoundryAssetPackResult =
  | { ok: true; manifest: FoundryAssetPackManifest; payloadBytes: Record<string, Buffer>; packDir: string }
  | { ok: false; code: "manifest-missing" | "manifest-invalid" | "payload-missing" | "payload-sha256-mismatch"; message: string; packDir: string };

export async function readFoundryAssetPack(packDir: string): Promise<ReadFoundryAssetPackResult> {
  const manifestPath = join(packDir, FOUNDRY_PACK_FILENAME);
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
  const parsed = FoundryAssetPackManifestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { ok: false, code: "manifest-invalid", message: parsed.error.message, packDir };
  }
  const manifest = parsed.data;
  const payloadBytes: Record<string, Buffer> = {};
  for (const f of manifest.payload.files) {
    const abs = join(packDir, FOUNDRY_PACK_PAYLOAD_DIR, f.relPath);
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
