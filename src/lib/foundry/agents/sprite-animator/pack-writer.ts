import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computePerceptualHash } from "@/lib/artlab/coherence/hashes";
import type { FoundrySpriteAction } from "./types";

function atomicWrite(path: string, bytes: Buffer | string): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  if (typeof bytes === "string") {
    writeFileSync(tmp, bytes, "utf8");
  } else {
    writeFileSync(tmp, bytes);
  }
  renameSync(tmp, path);
}

export interface FoundrySpritePackInput {
  runDir: string;
  characterId: string;
  action: FoundrySpriteAction;
  frames: ReadonlyArray<Buffer>;
}

export interface FoundrySpritePackFrameManifest {
  index: number;
  path: string;
  perceptualHash: string;
}

export interface FoundrySpritePackResult {
  packRoot: string;
  frameManifests: ReadonlyArray<FoundrySpritePackFrameManifest>;
  /**
   * Original PNG bytes for each frame, indexed by frame index. Callers
   * (notably the manifest builder in `index.ts`) hand these to
   * `createFoundryAssetPack` so the canonical pack's `payload/<frame>.png`
   * files round-trip the exact same bytes as the looser
   * `<packRoot>/<frame>.png` references emitted here.
   */
  frameBytes: ReadonlyArray<Buffer>;
}

export async function writeFoundrySpritePack(
  input: FoundrySpritePackInput,
): Promise<FoundrySpritePackResult> {
  const packRoot = join(input.runDir, "pack");
  mkdirSync(packRoot, { recursive: true });
  const manifests: FoundrySpritePackFrameManifest[] = [];
  const frameBytes: Buffer[] = [];
  for (let i = 0; i < input.frames.length; i += 1) {
    const padded = String(i).padStart(3, "0");
    const filename = `frame-${padded}.png`;
    atomicWrite(join(packRoot, filename), input.frames[i]!);
    const hash = await computePerceptualHash(input.frames[i]!);
    manifests.push({ index: i, path: filename, perceptualHash: hash });
    frameBytes.push(input.frames[i]!);
  }
  return { packRoot, frameManifests: manifests, frameBytes };
}

export interface FoundryLottiePackInput {
  runDir: string;
  characterId: string;
  action: FoundrySpriteAction;
  lottieJson: string;
}

export interface FoundryLottiePackResult {
  packRoot: string;
  lottiePath: string;
}

export async function writeFoundryLottiePack(
  input: FoundryLottiePackInput,
): Promise<FoundryLottiePackResult> {
  const packRoot = join(input.runDir, "pack");
  mkdirSync(packRoot, { recursive: true });
  const filename = "lottie.json";
  atomicWrite(join(packRoot, filename), input.lottieJson);
  return { packRoot, lottiePath: filename };
}
