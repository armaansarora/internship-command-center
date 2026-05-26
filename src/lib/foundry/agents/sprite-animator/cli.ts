import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { runFoundrySpriteAnimator } from "./index";
import { createFoundrySpriteMockVideoProvider } from "./__tests__/mock-video-provider";
import { createFoundrySpriteMockLottieProvider } from "./__tests__/mock-lottie-provider";
import { FoundrySpriteAnimatorInputSchema } from "./types";
import type { FoundrySpriteAction, FoundrySpriteFormat } from "./types";

export interface FoundrySpriteAnimatorCliInput {
  sourcePackId: string;
  action: FoundrySpriteAction;
  format: FoundrySpriteFormat;
  runDir?: string;
  /**
   * Root directory containing promoted character packs. Defaults to the
   * `FOUNDRY_PACKS_ROOT` env var so the CLI works against the production
   * pack registry without explicit wiring; tests pass an explicit value
   * (often a tmp dir) and rely on the `loadFoundryAssetPack` mock.
   */
  packsRoot?: string;
  providerKind: "mock" | "sora" | "runway" | "claude";
  seed?: number;
  dryRun?: boolean;
  /** test-only injection so identity-drift can run without disk */
  anchorBytesOverride?: Buffer;
}

export interface FoundrySpriteAnimatorCliResult {
  summary: string;
  runDir: string;
  packId?: string;
}

export async function runFoundrySpriteAnimatorCli(
  input: FoundrySpriteAnimatorCliInput,
): Promise<FoundrySpriteAnimatorCliResult> {
  const runDir =
    input.runDir ?? mkdtempSync(join(tmpdir(), "foundry-anim-run-"));
  const parsed = FoundrySpriteAnimatorInputSchema.parse({
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
      `foundry/sprite-animator cli: provider kind ${input.providerKind} not yet wired`,
    );
  }
  const packsRoot = input.packsRoot ?? process.env.FOUNDRY_PACKS_ROOT ?? join(tmpdir(), "foundry-cli-packs");
  const result = await runFoundrySpriteAnimator(
    parsed,
    {
      video: createFoundrySpriteMockVideoProvider(),
      lottie: createFoundrySpriteMockLottieProvider(),
    },
    { runDir, packsRoot, anchorBytesOverride: input.anchorBytesOverride },
  );
  return {
    summary: `animation ${parsed.sourcePackId}/${parsed.action}/${parsed.format} pack ${result.packId} validated`,
    runDir,
    packId: result.packId,
  };
}
