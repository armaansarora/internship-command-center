import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabAssetType } from "../types";
import { renderPlaceholderImage } from "../speed/placeholder-images";
import { displayFor } from "../intake/known-cast";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";
import { runCutoutPool } from "@/lib/artlab/speed/cutout-pool";

const CUTOUT_REQUIRED: ReadonlySet<ArtLabAssetType> = new Set(["character", "prop"]);

async function cutoutOne(
  sourceDir: string,
  cutoutDir: string,
  src: string,
  fallbackPng: Buffer,
): Promise<string> {
  const delayMs = Number.parseInt(process.env.ARTLAB_CUTOUT_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const dstName = src.replace(/\.json$/, ".png");
  const cutoutPath = join(cutoutDir, dstName);
  const srcPng = join(sourceDir, src.replace(/\.json$/, ".png"));
  if (existsSync(srcPng)) {
    // Real PNG source — copy as-is (sharp segmentation would happen here in production)
    copyFileSync(srcPng, cutoutPath);
  } else {
    // No source PNG (test path or pre-production-runner) — write the shared
    // pre-rendered placeholder. Render-once-reuse-many keeps the cutout pool
    // dominated by I/O, not sharp compile-time.
    writeFileSync(cutoutPath, fallbackPng);
  }
  return cutoutPath;
}

export const cutoutRunner: ArtLabRunner = {
  kind: "cutout",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (!CUTOUT_REQUIRED.has(input.assetType)) {
      return {
        runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
        artifacts: { skippedReason: "asset-type-has-no-cutout" },
      };
    }
    const sourceDir = join(input.runDir, "production-slots");
    const cutoutDir = join(input.runDir, "cutouts");
    if (!existsSync(cutoutDir)) mkdirSync(cutoutDir, { recursive: true });
    const sources = existsSync(sourceDir) ? readdirSync(sourceDir).filter((f) => f.endsWith(".json")) : [];
    const cutoutPaths: string[] = [];
    // Pre-render the fallback placeholder once per run — sharp's first call is
    // ~30-50ms, so render-per-cutout would dominate wall-clock of mock-mode runs
    // (see cutout-runner.pool.test.ts). Reused below for any source missing a
    // production-stage PNG.
    const display = displayFor(input.characterId);
    const fallbackPng = await renderPlaceholderImage({
      title: display.firstName,
      subtitle: "production sprite · cutout",
    });
    // SPEED: Phase 5 — runCutoutPool with capped concurrency. Each task
    // writes to its own file; no shared mutable state. Quality preservation:
    // exactly one cutout per source file, same naming.
    const tasks = sources.map((src) => async () => {
      cutoutPaths.push(await cutoutOne(sourceDir, cutoutDir, src, fallbackPng));
    });
    await runCutoutPool({ tasks });
    return {
      runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { cutoutPaths: cutoutPaths.sort() },
    };
  },
};
