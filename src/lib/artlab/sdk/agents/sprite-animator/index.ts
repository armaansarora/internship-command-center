import { readFileSync, existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import sharp from "sharp";
import {
  buildFoundryAssetPack,
  createFoundryAssetPack,
  resolveFoundrySlot,
  type FoundryAssetPackManifest,
} from "@/lib/artlab/sdk/asset-pack";
import { resolveFoundrySpriteSourcePack } from "./source-pack";
import { runFoundrySpriteQa, type FoundrySpriteQaReport } from "./qa";
import { writeFoundrySpritePack, writeFoundryLottiePack } from "./pack-writer";
import {
  renderFoundrySpriteIntegrationSnippet,
  renderFoundryLottieIntegrationSnippet,
} from "./integration";
import {
  FoundrySpriteAnimatorInputSchema,
  type FoundrySpriteAnimatorInput,
  type FoundrySpriteAction,
  type FoundrySpriteFormat,
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
  manifest: FoundryAssetPackManifest;
}

const VALID_ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:3", "3:4"] as const;
type FoundryAspectRatio = (typeof VALID_ASPECT_RATIOS)[number];

/**
 * Snap (width, height) to the manifest schema's allowed aspect-ratio enum.
 * Returns `null` if the ratio diverges by more than 5% from any allowed
 * option — production callers should normalise the source asset rather than
 * coerce an off-grid ratio into the manifest. We accept a small tolerance
 * because providers occasionally return frames off by one pixel.
 */
function pickAspectRatio(width: number, height: number): FoundryAspectRatio | null {
  const actual = width / height;
  let best: { value: FoundryAspectRatio; err: number } | null = null;
  for (const candidate of VALID_ASPECT_RATIOS) {
    const [a, b] = candidate.split(":").map(Number) as [number, number];
    const target = a / b;
    const err = Math.abs(actual - target) / target;
    if (best === null || err < best.err) {
      best = { value: candidate, err };
    }
  }
  if (best === null || best.err > 0.05) return null;
  return best.value;
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

function buildPackId(
  sourcePackId: string,
  action: FoundrySpriteAction,
  format: FoundrySpriteFormat,
  runId: string,
): string {
  // packId carries the source character pack, action, format, and a runId
  // suffix so the same character/action/format can be regenerated against
  // new providers without colliding with an existing pack on disk.
  return `sprite-anim-${sourcePackId}-${action}-${format}-${runId.slice(0, 8)}`;
}

function buildIntendedSlot(
  characterId: string,
  action: FoundrySpriteAction,
  format: FoundrySpriteFormat,
): FoundryAssetPackManifest["intendedSlot"] {
  const slotId = `animations/${characterId}/${action}/${format}`;
  const slot = resolveFoundrySlot(slotId);
  if (!slot) {
    throw new Error(
      `foundry/sprite-animator: slot ${slotId} is not registered — register it under FOUNDRY_SLOT_REGISTRY before generating animations for ${characterId}/${action}/${format}`,
    );
  }
  return {
    slotId: slot.slotId,
    appPath: slot.appPath,
    component: slot.component,
    requiresGsap: slot.requiresGsap,
  };
}

function buildGsapCues(
  action: FoundrySpriteAction,
  durationMs: number,
  motionCurve: string,
): FoundryAssetPackManifest["gsapCues"] {
  // A single cue per pack — drives the integration snippet's GSAP timeline.
  // Sprite/Lottie consumers can extend with secondary cues without breaking
  // the manifest contract. cueId is constrained to /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
  // because the asset-pack integration-snippet renderer interpolates it raw
  // into generated TSX (e.g., `const tl_${cueId} = gsap.timeline();`), so
  // we capitalise the action and prefix with a static identifier.
  const safeAction = action.charAt(0).toUpperCase() + action.slice(1);
  return [
    {
      cueId: `cue${safeAction}Main`,
      targetSelector: `[data-foundry-animation="${action}"]`,
      timeline: "main",
      durationMs,
      easing: motionCurve,
    },
  ];
}

function buildAccessibility(
  characterId: string,
  action: FoundrySpriteAction,
): FoundryAssetPackManifest["accessibility"] {
  return {
    altText: `${characterId} ${action} animation`,
    role: "img",
    prefersReducedMotionStrategy: "static-fallback",
  };
}

function nowIso(): string {
  return new Date().toISOString();
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
  const startedAt = performance.now();
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
    return await buildSpriteManifest({
      input,
      context,
      source,
      qa,
      frames: video.frames,
      generation: { startedAt, costCents: video.costCents, mode: video.mode },
    });
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
  return await buildLottieManifest({
    input,
    context,
    source,
    qa,
    lottieJson: lottie.lottieJson,
    expectedDurationMs,
    generation: { startedAt, costCents: lottie.costCents, mode: lottie.mode },
  });
}

interface BuildSpriteManifestInput {
  input: FoundrySpriteAnimatorInput;
  context: FoundrySpriteAnimatorContext;
  source: { characterId: string; packId: string };
  qa: FoundrySpriteQaReport;
  frames: ReadonlyArray<Buffer>;
  generation: { startedAt: number; costCents: number; mode: "real" | "mock" };
}

async function buildSpriteManifest(
  args: BuildSpriteManifestInput,
): Promise<FoundrySpriteAnimatorResult> {
  const { input, context, source, qa, frames, generation } = args;
  const totalDurationMs = Math.round((input.frameCount / input.fps) * 1000);
  const written = await writeFoundrySpritePack({
    runDir: context.runDir,
    characterId: source.characterId,
    action: input.action,
    frames,
  });
  // Map sprite-animator sequence metadata + qa report into payload files so
  // the canonical manifest carries every byte downstream consumers need
  // without smuggling extra top-level fields past the strict schema.
  const sequencePayload = {
    fps: input.fps,
    loops: input.loops,
    frame_count: input.frameCount,
    total_duration_ms: totalDurationMs,
    motion_curve: input.motionCurve,
    transitions: [] as ReadonlyArray<unknown>,
    frames: written.frameManifests,
  };
  const integrationSnippet = renderFoundrySpriteIntegrationSnippet({
    characterId: source.characterId,
    action: input.action,
    packPath: written.packRoot,
    fps: input.fps,
    loops: input.loops,
  });
  const qaPayloadBytes = Buffer.from(JSON.stringify(qa), "utf8");
  const sequencePayloadBytes = Buffer.from(
    JSON.stringify(sequencePayload),
    "utf8",
  );
  const integrationPayloadBytes = Buffer.from(integrationSnippet, "utf8");
  const payloadFiles: Array<{ relPath: string; bytes: Buffer }> = [];
  for (const frame of written.frameManifests) {
    payloadFiles.push({
      relPath: frame.path,
      bytes: written.frameBytes[frame.index]!,
    });
  }
  payloadFiles.push({ relPath: "sequence.json", bytes: sequencePayloadBytes });
  payloadFiles.push({ relPath: "qa.json", bytes: qaPayloadBytes });
  payloadFiles.push({ relPath: "integration.tsx", bytes: integrationPayloadBytes });

  const dims = await readSpriteDimensions(frames[0]!);
  const aspectRatio = pickAspectRatio(dims.width, dims.height);
  if (!aspectRatio) {
    throw new Error(
      `foundry/sprite-animator: sprite dimensions ${dims.width}×${dims.height} do not snap to a supported aspect ratio`,
    );
  }
  const generationMs = Math.round(performance.now() - generation.startedAt);
  const packId = buildPackId(
    input.sourcePackId,
    input.action,
    "sprite",
    input.runId,
  );

  const created = await createFoundryAssetPack({
    packDir: written.packRoot,
    packId,
    kind: "sprite-animation",
    agent: "sprite-animator",
    canonRefs: {
      characterId: source.characterId,
      paletteRef: null,
      typographyRef: null,
      motionLanguageRef: null,
    },
    dimensions: {
      sourceWidthPx: dims.width,
      sourceHeightPx: dims.height,
      displayWidthPx: dims.width,
      displayHeightPx: dims.height,
      aspectRatio,
    },
    colorTokensUsed: ["primaryDark"],
    intendedSlot: buildIntendedSlot(
      source.characterId,
      input.action,
      "sprite",
    ),
    gsapCues: buildGsapCues(input.action, totalDurationMs, input.motionCurve),
    accessibility: buildAccessibility(source.characterId, input.action),
    integrationSnippetTemplate: "character-sprite-img",
    payloadFiles,
    primaryFileRelPath: written.frameManifests[0]!.path,
    generation: {
      agentName: "sprite-animator",
      provider: generation.mode === "real" ? "foundry-sprite-real" : "foundry-sprite-mock",
      modelId: generation.mode === "real" ? "foundry-sprite-v1" : "foundry-sprite-mock",
      seed: input.seed ?? 0,
      costCents: generation.costCents,
      durationMs: generationMs,
      generatedAt: nowIso(),
    },
  });

  // Defence-in-depth: route the persisted manifest through buildFoundryAssetPack
  // so external callers see exactly the same validated envelope they would if
  // they called the entry point directly.
  const built = await buildFoundryAssetPack(created.manifest);
  return { packId: built.packId, manifest: built.manifest };
}

interface BuildLottieManifestInput {
  input: FoundrySpriteAnimatorInput;
  context: FoundrySpriteAnimatorContext;
  source: { characterId: string; packId: string };
  qa: FoundrySpriteQaReport;
  lottieJson: string;
  expectedDurationMs: number;
  generation: { startedAt: number; costCents: number; mode: "real" | "mock" };
}

async function buildLottieManifest(
  args: BuildLottieManifestInput,
): Promise<FoundrySpriteAnimatorResult> {
  const { input, context, source, qa, lottieJson, expectedDurationMs, generation } = args;
  const written = await writeFoundryLottiePack({
    runDir: context.runDir,
    characterId: source.characterId,
    action: input.action,
    lottieJson,
  });
  const integrationSnippet = renderFoundryLottieIntegrationSnippet({
    characterId: source.characterId,
    action: input.action,
    packPath: written.packRoot,
    lottiePath: written.lottiePath,
    durationMs: expectedDurationMs,
  });
  const dims = readLottieDimensions(lottieJson);
  const aspectRatio = pickAspectRatio(dims.width, dims.height);
  if (!aspectRatio) {
    throw new Error(
      `foundry/sprite-animator: lottie dimensions ${dims.width}×${dims.height} do not snap to a supported aspect ratio`,
    );
  }
  const lottieMetaPayload = {
    version: "5.7.0",
    duration_ms: expectedDurationMs,
    motion_curve: input.motionCurve,
    loops: input.loops,
  };
  const payloadFiles: Array<{ relPath: string; bytes: Buffer }> = [
    { relPath: written.lottiePath, bytes: Buffer.from(lottieJson, "utf8") },
    { relPath: "lottie-meta.json", bytes: Buffer.from(JSON.stringify(lottieMetaPayload), "utf8") },
    { relPath: "qa.json", bytes: Buffer.from(JSON.stringify(qa), "utf8") },
    { relPath: "integration.tsx", bytes: Buffer.from(integrationSnippet, "utf8") },
  ];
  const generationMs = Math.round(performance.now() - generation.startedAt);
  const packId = buildPackId(
    input.sourcePackId,
    input.action,
    "lottie",
    input.runId,
  );

  const created = await createFoundryAssetPack({
    packDir: written.packRoot,
    packId,
    kind: "sprite-animation",
    agent: "sprite-animator",
    canonRefs: {
      characterId: source.characterId,
      paletteRef: null,
      typographyRef: null,
      motionLanguageRef: null,
    },
    dimensions: {
      sourceWidthPx: dims.width,
      sourceHeightPx: dims.height,
      displayWidthPx: dims.width,
      displayHeightPx: dims.height,
      aspectRatio,
    },
    colorTokensUsed: ["primaryDark"],
    intendedSlot: buildIntendedSlot(
      source.characterId,
      input.action,
      "lottie",
    ),
    gsapCues: buildGsapCues(input.action, expectedDurationMs, input.motionCurve),
    accessibility: buildAccessibility(source.characterId, input.action),
    integrationSnippetTemplate: "character-sprite-img",
    payloadFiles,
    primaryFileRelPath: written.lottiePath,
    generation: {
      agentName: "sprite-animator",
      provider: generation.mode === "real" ? "foundry-lottie-real" : "foundry-lottie-mock",
      modelId: generation.mode === "real" ? "foundry-lottie-v1" : "foundry-lottie-mock",
      seed: input.seed ?? 0,
      costCents: generation.costCents,
      durationMs: generationMs,
      generatedAt: nowIso(),
    },
  });

  const built = await buildFoundryAssetPack(created.manifest);
  return { packId: built.packId, manifest: built.manifest };
}

async function readSpriteDimensions(
  png: Buffer,
): Promise<{ width: number; height: number }> {
  const meta = await sharp(png).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("foundry/sprite-animator: could not read PNG dimensions from frame");
  }
  return { width: meta.width, height: meta.height };
}

function readLottieDimensions(lottieJson: string): { width: number; height: number } {
  const parsed = JSON.parse(lottieJson) as { w?: unknown; h?: unknown };
  if (typeof parsed.w !== "number" || typeof parsed.h !== "number") {
    throw new Error(
      "foundry/sprite-animator: lottie JSON missing numeric `w`/`h` dimensions",
    );
  }
  if (parsed.w <= 0 || parsed.h <= 0) {
    throw new Error(
      `foundry/sprite-animator: lottie JSON has non-positive dimensions w=${parsed.w} h=${parsed.h}`,
    );
  }
  return { width: parsed.w, height: parsed.h };
}
