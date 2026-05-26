import { mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { sha256OfBytes } from "./hashing";
import { FOUNDRY_ASSET_PACK_VERSION, FOUNDRY_PACK_FILENAME, FOUNDRY_PACK_PAYLOAD_DIR } from "./constants";
import {
  FoundryAssetPackManifestSchema,
  isPathSafeAgainstTraversal,
  type FoundryAssetPackManifest,
} from "./manifest.schema";

export interface CreateFoundryAssetPackInput {
  packDir: string;
  kind: FoundryAssetPackManifest["kind"];
  agent: FoundryAssetPackManifest["agent"];
  canonRefs: FoundryAssetPackManifest["canonRefs"];
  dimensions: FoundryAssetPackManifest["dimensions"];
  colorTokensUsed: FoundryAssetPackManifest["colorTokensUsed"];
  intendedSlot: FoundryAssetPackManifest["intendedSlot"];
  gsapCues: FoundryAssetPackManifest["gsapCues"];
  accessibility: FoundryAssetPackManifest["accessibility"];
  integrationSnippetTemplate: FoundryAssetPackManifest["integrationSnippetTemplate"];
  payloadFiles: ReadonlyArray<{ relPath: string; bytes: Buffer }>;
  primaryFileRelPath: string;
  generation: FoundryAssetPackManifest["generation"];
  packId?: string;
}

export interface CreatedFoundryAssetPack {
  packDir: string;
  manifest: FoundryAssetPackManifest;
}

async function atomicWriteFile(path: string, bytes: Buffer | string): Promise<void> {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tmp, bytes);
  await rename(tmp, path);
}

export async function createFoundryAssetPack(input: CreateFoundryAssetPackInput): Promise<CreatedFoundryAssetPack> {
  if (input.payloadFiles.length === 0) {
    throw new Error("createFoundryAssetPack: payloadFiles must not be empty");
  }

  await mkdir(input.packDir, { recursive: true });
  const payloadDir = join(input.packDir, FOUNDRY_PACK_PAYLOAD_DIR);
  await mkdir(payloadDir, { recursive: true });
  // Resolve once so the containment guard compares canonical absolute paths.
  // The trailing separator is required so a sibling dir whose name shares a
  // prefix (e.g. `payloadX/`) cannot satisfy `startsWith`.
  const payloadDirResolved = resolve(payloadDir);
  const payloadDirPrefix = payloadDirResolved + sep;

  const files: FoundryAssetPackManifest["payload"]["files"] = [];
  for (const f of input.payloadFiles) {
    // Reviewer Critical 2 — the prior literal `includes("..")` check was
    // bypassed by absolute paths, backslashes, NUL bytes, and percent-
    // encoding. Route every relPath through the same defence-in-depth
    // helper the schema uses for manifest-resident relPaths so the writer
    // enforces the identical allow-list before touching the filesystem.
    if (!isPathSafeAgainstTraversal(f.relPath, null)) {
      throw new Error(
        `createFoundryAssetPack: payload relPath must be a canonical relative path (no traversal, no encoding, no backslash, no leading slash, no NUL): ${JSON.stringify(f.relPath)}`,
      );
    }
    const abs = join(payloadDir, f.relPath);
    const absResolved = resolve(abs);
    // Belt-and-braces containment guard. Even if the validator above ever
    // regresses, the join+resolve result MUST land inside payloadDir.
    if (!(absResolved === payloadDirResolved || absResolved.startsWith(payloadDirPrefix))) {
      throw new Error(
        `createFoundryAssetPack: payload relPath resolved outside payloadDir: ${JSON.stringify(f.relPath)}`,
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
    throw new Error(`createFoundryAssetPack: primaryFileRelPath "${input.primaryFileRelPath}" not in payloadFiles`);
  }

  const manifest: FoundryAssetPackManifest = FoundryAssetPackManifestSchema.parse({
    manifestVersion: FOUNDRY_ASSET_PACK_VERSION,
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
  });

  await atomicWriteFile(join(input.packDir, FOUNDRY_PACK_FILENAME), JSON.stringify(manifest, null, 2));

  return { packDir: input.packDir, manifest };
}
