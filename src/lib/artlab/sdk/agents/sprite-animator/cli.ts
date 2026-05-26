import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { runArtLabSpriteAnimator } from "./index";
import { createArtLabSpriteMockVideoProvider } from "./__tests__/mock-video-provider";
import { createArtLabSpriteMockLottieProvider } from "./__tests__/mock-lottie-provider";
import { ArtLabSpriteAnimatorInputSchema } from "./types";
import type { ArtLabSpriteAction, ArtLabSpriteFormat } from "./types";

export interface ArtLabSpriteAnimatorCliInput {
  sourcePackId: string;
  action: ArtLabSpriteAction;
  format: ArtLabSpriteFormat;
  runDir?: string;
  /**
   * Root directory containing promoted character packs. Defaults to the
   * `ARTLAB_PACKS_ROOT` env var so the CLI works against the production
   * pack registry without explicit wiring; tests pass an explicit value
   * (often a tmp dir) and rely on the `loadArtLabAssetPack` mock.
   */
  packsRoot?: string;
  providerKind: "mock" | "sora" | "runway" | "claude";
  seed?: number;
  dryRun?: boolean;
  /** test-only injection so identity-drift can run without disk */
  anchorBytesOverride?: Buffer;
}

export interface ArtLabSpriteAnimatorCliResult {
  summary: string;
  runDir: string;
  packId?: string;
}

export async function runArtLabSpriteAnimatorCli(
  input: ArtLabSpriteAnimatorCliInput,
): Promise<ArtLabSpriteAnimatorCliResult> {
  const runDir =
    input.runDir ?? mkdtempSync(join(tmpdir(), "artlab-anim-run-"));
  const parsed = ArtLabSpriteAnimatorInputSchema.parse({
    runId: randomUUID(),
    sourcePackId: input.sourcePackId,
    action: input.action,
    format: input.format,
    requestedBy: "cli" as const,
    seed: input.seed,
  });
  if (input.dryRun) {
    return {
      summary: `animation ${parsed.sourcePackId}/${parsed.action}/${parsed.format} validated`,
      runDir,
    };
  }
  if (input.providerKind !== "mock") {
    throw new Error(
      `artlab/sprite-animator cli: provider kind ${input.providerKind} not yet wired`,
    );
  }
  const packsRoot = input.packsRoot ?? process.env.ARTLAB_PACKS_ROOT ?? join(tmpdir(), "artlab-cli-packs");
  const result = await runArtLabSpriteAnimator(
    parsed,
    {
      video: createArtLabSpriteMockVideoProvider(),
      lottie: createArtLabSpriteMockLottieProvider(),
    },
    { runDir, packsRoot, anchorBytesOverride: input.anchorBytesOverride },
  );
  return {
    summary: `animation ${parsed.sourcePackId}/${parsed.action}/${parsed.format} pack ${result.packId} validated`,
    runDir,
    packId: result.packId,
  };
}
