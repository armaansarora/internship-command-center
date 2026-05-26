import { mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { sha256OfBytes } from "./hashing";
import { ARTLAB_ASSET_PACK_VERSION, ARTLAB_PACK_FILENAME, ARTLAB_PACK_PAYLOAD_DIR } from "./constants";
import {
  ArtLabAssetPackManifestSchema,
  isPathSafeAgainstTraversal,
  type ArtLabAssetPackManifest,
} from "./manifest.schema";

export interface CreateArtLabAssetPackInput {
  packDir: string;
  kind: ArtLabAssetPackManifest["kind"];
  agent: ArtLabAssetPackManifest["agent"];
  canonRefs: ArtLabAssetPackManifest["canonRefs"];
  dimensions: ArtLabAssetPackManifest["dimensions"];
  colorTokensUsed: ArtLabAssetPackManifest["colorTokensUsed"];
  intendedSlot: ArtLabAssetPackManifest["intendedSlot"];
  gsapCues: ArtLabAssetPackManifest["gsapCues"];
  accessibility: ArtLabAssetPackManifest["accessibility"];
  integrationSnippetTemplate: ArtLabAssetPackManifest["integrationSnippetTemplate"];
  payloadFiles: ReadonlyArray<{ relPath: string; bytes: Buffer }>;
  primaryFileRelPath: string;
  generation: ArtLabAssetPackManifest["generation"];
  packId?: string;
  /**
   * Critical 1 alignment: REQUIRED when `kind === "character-spritesheet"`.
   * Points at the payload relPath of the anchor sprite. Downstream
   * sprite-animator reads this to load the character's anchor bytes for
   * Lottie identity verification. Optional for non-character kinds.
   */
  anchorImageRelPath?: ArtLabAssetPackManifest["anchorImageRelPath"];
  /**
   * Critical 1 alignment: REQUIRED when `kind === "character-spritesheet"`.
   * 16-hex perceptual hash of the anchor sprite bytes (8×8 greyscale dHash).
   * Compared bit-for-bit against embedded image hashes by the Lottie
   * identity gate.
   */
  anchorPerceptualHash?: ArtLabAssetPackManifest["anchorPerceptualHash"];
}

export interface CreatedArtLabAssetPack {
  packDir: string;
  manifest: ArtLabAssetPackManifest;
}

async function atomicWriteFile(path: string, bytes: Buffer | string): Promise<void> {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tmp, bytes);
  await rename(tmp, path);
}

export async function createArtLabAssetPack(input: CreateArtLabAssetPackInput): Promise<CreatedArtLabAssetPack> {
  if (input.payloadFiles.length === 0) {
    throw new Error("createArtLabAssetPack: payloadFiles must not be empty");
  }

  await mkdir(input.packDir, { recursive: true });
  const payloadDir = join(input.packDir, ARTLAB_PACK_PAYLOAD_DIR);
  await mkdir(payloadDir, { recursive: true });
  // Resolve once so the containment guard compares canonical absolute paths.
  // The trailing separator is required so a sibling dir whose name shares a
  // prefix (e.g. `payloadX/`) cannot satisfy `startsWith`.
  const payloadDirResolved = resolve(payloadDir);
  const payloadDirPrefix = payloadDirResolved + sep;

  const files: ArtLabAssetPackManifest["payload"]["files"] = [];
  for (const f of input.payloadFiles) {
    // Reviewer Critical 2 — the prior literal `includes("..")` check was
    // bypassed by absolute paths, backslashes, NUL bytes, and percent-
    // encoding. Route every relPath through the same defence-in-depth
    // helper the schema uses for manifest-resident relPaths so the writer
    // enforces the identical allow-list before touching the filesystem.
    if (!isPathSafeAgainstTraversal(f.relPath, null)) {
      throw new Error(
        `createArtLabAssetPack: payload relPath must be a canonical relative path (no traversal, no encoding, no backslash, no leading slash, no NUL): ${JSON.stringify(f.relPath)}`,
      );
    }
    const abs = join(payloadDir, f.relPath);
    const absResolved = resolve(abs);
    // Belt-and-braces containment guard. Even if the validator above ever
    // regresses, the join+resolve result MUST land inside payloadDir.
    if (!(absResolved === payloadDirResolved || absResolved.startsWith(payloadDirPrefix))) {
      throw new Error(
        `createArtLabAssetPack: payload relPath resolved outside payloadDir: ${JSON.stringify(f.relPath)}`,
      );
    }
    // Replace the prior fragile `join(abs, "..").replace(/\/\.$/, "")` parent
    // math with `path.dirname`, which handles trailing-slash and "." segments
    // correctly across platforms.
    await mkdir(dirname(abs), { recursive: true });
    await atomicWriteFile(abs, f.bytes);
    files.push({
      relPath: f.relPath,
      sha256: sha256OfBytes(f.bytes),
      bytes: f.bytes.byteLength,
    });
  }

  if (!files.some((f) => f.relPath === input.primaryFileRelPath)) {
    throw new Error(`createArtLabAssetPack: primaryFileRelPath "${input.primaryFileRelPath}" not in payloadFiles`);
  }

  const manifestInput: Record<string, unknown> = {
    manifestVersion: ARTLAB_ASSET_PACK_VERSION,
    packId: input.packId ?? randomUUID(),
    kind: input.kind,
    agent: input.agent,
    canonRefs: input.canonRefs,
    dimensions: input.dimensions,
    colorTokensUsed: input.colorTokensUsed,
    intendedSlot: input.intendedSlot,
    gsapCues: input.gsapCues,
    accessibility: input.accessibility,
    integrationSnippetTemplate: input.integrationSnippetTemplate,
    payload: { files, primaryFileRelPath: input.primaryFileRelPath },
    generation: input.generation,
  };
  if (input.anchorImageRelPath !== undefined) {
    manifestInput.anchorImageRelPath = input.anchorImageRelPath;
  }
  if (input.anchorPerceptualHash !== undefined) {
    manifestInput.anchorPerceptualHash = input.anchorPerceptualHash;
  }
  const manifest: ArtLabAssetPackManifest = ArtLabAssetPackManifestSchema.parse(manifestInput);

  await atomicWriteFile(join(input.packDir, ARTLAB_PACK_FILENAME), JSON.stringify(manifest, null, 2));

  return { packDir: input.packDir, manifest };
}
