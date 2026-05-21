import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabAssetType } from "../types";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";
import { runCutoutPool } from "@/lib/artlab/speed/cutout-pool";

const CUTOUT_REQUIRED: ReadonlySet<ArtLabAssetType> = new Set(["character", "prop"]);

async function cutoutOne(sourceDir: string, cutoutDir: string, src: string): Promise<string> {
  const delayMs = Number.parseInt(process.env.ARTLAB_CUTOUT_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const path = join(cutoutDir, `${src.replace(/\.json$/, ".png")}`);
  writeFileSync(path, JSON.stringify({ source: src, alpha: true, mock: true }));
  return path;
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
    // SPEED: Phase 5 — runCutoutPool with capped concurrency. Each task
    // writes to its own file; no shared mutable state. Quality preservation:
    // exactly one cutout per source file, same naming.
    const tasks = sources.map((src) => async () => {
      cutoutPaths.push(await cutoutOne(sourceDir, cutoutDir, src));
    });
    await runCutoutPool({ tasks });
    return {
      runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { cutoutPaths: cutoutPaths.sort() },
    };
  },
};
