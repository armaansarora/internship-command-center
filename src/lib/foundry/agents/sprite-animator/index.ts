import { readFileSync, existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { buildFoundryAssetPack } from "@/lib/foundry/asset-pack";
import { resolveFoundrySpriteSourcePack } from "./source-pack";
import { runFoundrySpriteQa } from "./qa";
import {
  writeFoundrySpritePack,
  writeFoundryLottiePack,
} from "./pack-writer";
import {
  renderFoundrySpriteIntegrationSnippet,
  renderFoundryLottieIntegrationSnippet,
} from "./integration";
import {
  FoundrySpriteAnimatorInputSchema,
  type FoundrySpriteAnimatorInput,
} from "./types";
import type { FoundryVideoProvider } from "./video-provider";
import type { FoundryLottieProvider } from "./lottie-provider";

export interface FoundrySpriteAnimatorProviders {
  video: FoundryVideoProvider;
  lottie: FoundryLottieProvider;
}

export interface FoundrySpriteAnimatorContext {
  runDir: string;
  /**
   * Root directory holding promoted character packs. `resolveFoundrySpriteSourcePack`
   * joins this with the `sourcePackId` to locate the pack on disk. Tests
   * may pass any prefix and rely on the `loadFoundryAssetPack` mock; the
   * production daemon wires this from `FOUNDRY_PACKS_ROOT`.
   */
  packsRoot: string;
  /**
   * Override the anchor PNG bytes loaded from disk. Tests pass this so the
   * identity-drift gate can operate without populating a real file system.
   */
  anchorBytesOverride?: Buffer;
}

export interface FoundrySpriteAnimatorResult {
  packId: string;
  manifest: Record<string, unknown>;
}

function loadAnchorBytes(
  source: { anchorImagePath: string },
  context: FoundrySpriteAnimatorContext,
): Buffer {
  if (context.anchorBytesOverride) {
    return context.anchorBytesOverride;
  }
  const path = resolvePath(source.anchorImagePath);
  if (!existsSync(path)) {
    throw new Error(
      `foundry/sprite-animator: anchor image not found at ${path}`,
    );
  }
  return readFileSync(path);
}

export async function runFoundrySpriteAnimator(
  rawInput: FoundrySpriteAnimatorInput,
  providers: FoundrySpriteAnimatorProviders,
  context: FoundrySpriteAnimatorContext,
): Promise<FoundrySpriteAnimatorResult> {
  const input = FoundrySpriteAnimatorInputSchema.parse(rawInput);
  const source = await resolveFoundrySpriteSourcePack(input.sourcePackId, {
    packsRoot: context.packsRoot,
  });
  const anchorBytes = loadAnchorBytes(source, context);
  if (input.format === "sprite") {
    const video = await providers.video.generateFrames({
      prompt: `${source.characterId} ${input.action} ${input.motionCurve}, ${input.frameCount}f, ${input.fps}fps`,
      frameCount: input.frameCount,
      fps: input.fps,
      referenceImageBytes: anchorBytes,
      seed: input.seed,
    });
    if (video.frames.length !== input.frameCount) {
      throw new Error(
        `foundry/sprite-animator: video provider returned ${video.frames.length} frames (expected ${input.frameCount})`,
      );
    }
    const qa = await runFoundrySpriteQa({
      kind: "sprite",
      anchorBytes,
      frames: video.frames,
    });
    if (!qa.passed) {
      throw new Error(
        `foundry/sprite-animator: qa failed for ${source.characterId}/${input.action}/sprite — gates=${qa.failedGates.join(",")}`,
      );
    }
    const pack = await writeFoundrySpritePack({
      runDir: context.runDir,
      characterId: source.characterId,
      action: input.action,
      frames: video.frames,
    });
    const totalDurationMs = Math.round((input.frameCount / input.fps) * 1000);
    const integrationSnippet = renderFoundrySpriteIntegrationSnippet({
      characterId: source.characterId,
      action: input.action,
      packPath: pack.packRoot,
      fps: input.fps,
      loops: input.loops,
    });
    const manifest = {
      assetKind: "character-sprite-animation" as const,
      characterId: source.characterId,
      sourcePackId: input.sourcePackId,
      action: input.action,
      sprite: {
        frames: pack.frameManifests,
        fps: input.fps,
        loops: input.loops,
        frame_count: input.frameCount,
        total_duration_ms: totalDurationMs,
        transitions: [],
      },
      integrationSnippet,
      qa,
      __packDir: pack.packRoot,
    };
    return buildFoundryAssetPack(manifest);
  }
  // lottie format
  const expectedDurationMs = Math.round((input.frameCount / input.fps) * 1000);
  // Critical 3: pass the anchor PNG to the Lottie provider so the
  // authored Lottie can embed (or reference) the source character art.
  // The lottie-identity QA gate then verifies the embedded asset's
  // perceptual hash lands within tolerance of the source pack anchor.
  const lottie = await providers.lottie.authorLottie({
    motionCurve: input.motionCurve,
    durationMs: expectedDurationMs,
    action: input.action,
    seed: input.seed,
    referenceImageBytes: anchorBytes,
  });
  const qa = await runFoundrySpriteQa({
    kind: "lottie",
    lottieJson: lottie.lottieJson,
    expectedDurationMs,
    anchorPerceptualHash: source.anchorPerceptualHash,
  });
  if (!qa.passed) {
    throw new Error(
      `foundry/sprite-animator: qa failed for ${source.characterId}/${input.action}/lottie — gates=${qa.failedGates.join(",")}`,
    );
  }
  const pack = await writeFoundryLottiePack({
    runDir: context.runDir,
    characterId: source.characterId,
    action: input.action,
    lottieJson: lottie.lottieJson,
  });
  const integrationSnippet = renderFoundryLottieIntegrationSnippet({
    characterId: source.characterId,
    action: input.action,
    packPath: pack.packRoot,
    lottiePath: pack.lottiePath,
    durationMs: expectedDurationMs,
  });
  const manifest = {
    assetKind: "character-lottie-animation" as const,
    characterId: source.characterId,
    sourcePackId: input.sourcePackId,
    action: input.action,
    lottie: {
      lottiePath: pack.lottiePath,
      version: "5.7.0",
      durationMs: expectedDurationMs,
      motionCurve: input.motionCurve,
    },
    integrationSnippet,
    qa,
    __packDir: pack.packRoot,
  };
  return buildFoundryAssetPack(manifest);
}
