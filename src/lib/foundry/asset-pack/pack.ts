import { mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { sha256OfBytes } from "./hashing";
import { FOUNDRY_ASSET_PACK_VERSION, FOUNDRY_PACK_FILENAME, FOUNDRY_PACK_PAYLOAD_DIR } from "./constants";
import {
  FoundryAssetPackManifestSchema,
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

  const files: FoundryAssetPackManifest["payload"]["files"] = [];
  for (const f of input.payloadFiles) {
    if (f.relPath.includes("..")) throw new Error(`createFoundryAssetPack: payload relPath may not contain '..': ${f.relPath}`);
    const abs = join(payloadDir, f.relPath);
    await mkdir(join(abs, "..").replace(/\/\.$/, ""), { recursive: true });
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
