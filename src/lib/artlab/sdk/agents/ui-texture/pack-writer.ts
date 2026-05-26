// src/lib/artlab/sdk/agents/ui-texture/pack-writer.ts
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function atomicWrite(path: string, bytes: Buffer | string): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  if (typeof bytes === "string") {
    writeFileSync(tmp, bytes, "utf8");
  } else {
    writeFileSync(tmp, bytes);
  }
  renameSync(tmp, path);
}

export interface ArtLabUiIconPackInput {
  runDir: string;
  name: string;
  svg: string;
}

export interface ArtLabUiIconPackResult {
  packRoot: string;
  svgPath: string;
}

export async function writeArtLabUiIconPack(
  input: ArtLabUiIconPackInput,
): Promise<ArtLabUiIconPackResult> {
  const packRoot = join(input.runDir, "pack");
  mkdirSync(packRoot, { recursive: true });
  const filename = `${input.name}.svg`;
  atomicWrite(join(packRoot, filename), input.svg);
  return { packRoot, svgPath: filename };
}

export interface ArtLabUiTexturePackInput {
  runDir: string;
  name: string;
  pngBytes: Buffer;
  normalMapBytes: Buffer;
}

export interface ArtLabUiTexturePackResult {
  packRoot: string;
  pngPath: string;
  normalMapPath: string;
}

export async function writeArtLabUiTexturePack(
  input: ArtLabUiTexturePackInput,
): Promise<ArtLabUiTexturePackResult> {
  const packRoot = join(input.runDir, "pack");
  mkdirSync(packRoot, { recursive: true });
  const png = `${input.name}.png`;
  const normal = `${input.name}.normal.png`;
  atomicWrite(join(packRoot, png), input.pngBytes);
  atomicWrite(join(packRoot, normal), input.normalMapBytes);
  return { packRoot, pngPath: png, normalMapPath: normal };
}
