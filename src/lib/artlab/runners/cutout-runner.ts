// src/lib/artlab/runners/cutout-runner.ts
//
// Converts opaque source PNGs (from Gemini's image API — which doesn't
// emit transparent backgrounds) into RGBA PNGs with a true alpha channel.
//
// Strategy lives in `./cutout-primitives` (flood-fill + perimeter sampling
// + single-pass edge feather). This module is the orchestration layer:
// per-asset-type gating, batched cutout pool, warning sidecar emission,
// and the runner contract. The primitives are shared with the Tower Art
// ArtLab's `character-master` agent so both pipelines reuse the same
// mature implementation.
//
// Falls back to copying the source if sharp is unavailable or the source
// doesn't exist.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabAssetType } from "../types";
import { renderPlaceholderImage } from "../speed/placeholder-images";
import { displayFor } from "../intake/known-cast";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";
import { runCutoutPool } from "@/lib/artlab/speed/cutout-pool";
import { backdropSubtractToRgba } from "./cutout-primitives";

const CUTOUT_REQUIRED: ReadonlySet<ArtLabAssetType> = new Set(["character", "prop"]);

interface CutoutOutcome {
  cutoutPath: string;
  warning?: { slotId: string; reason: string; backdropStddev?: number; opaqueRatio?: number };
}

async function cutoutOne(
  sourceDir: string,
  cutoutDir: string,
  src: string,
  fallbackPng: Buffer,
): Promise<CutoutOutcome> {
  const delayMs = Number.parseInt(process.env.ARTLAB_CUTOUT_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const dstName = src.replace(/\.json$/, ".png");
  const slotId = dstName.replace(/\.png$/, "");
  const cutoutPath = join(cutoutDir, dstName);
  const srcPng = join(sourceDir, src.replace(/\.json$/, ".png"));
  if (existsSync(srcPng)) {
    try {
      const sourceBytes = readFileSync(srcPng);
      // Skip backdrop-subtract if the source is already a small placeholder
      // (sharp-rendered, no real backdrop to subtract). Heuristic: real
      // Gemini outputs are >150 KB. Placeholders are ~30 KB.
      if (sourceBytes.length > 100_000) {
        const result = await backdropSubtractToRgba(sourceBytes);
        writeFileSync(cutoutPath, result.bytes);
        if (result.noisyBackdropWarning) {
          return {
            cutoutPath,
            warning: {
              slotId,
              reason: "noisy-backdrop",
              backdropStddev: Number(result.backdropStddev.toFixed(2)),
              opaqueRatio: Number(result.opaquePixelRatio.toFixed(3)),
            },
          };
        }
      } else {
        copyFileSync(srcPng, cutoutPath);
      }
    } catch {
      // sharp failed (unsupported format / corrupt bytes) — copy as-is so
      // the strict-qa alpha probe at least sees a PNG file.
      copyFileSync(srcPng, cutoutPath);
    }
  } else {
    writeFileSync(cutoutPath, fallbackPng);
  }
  return { cutoutPath };
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
    const outcomes: CutoutOutcome[] = [];
    const display = displayFor(input.characterId);
    const fallbackPng = await renderPlaceholderImage({
      title: display.firstName,
      subtitle: "production sprite · cutout",
    });
    const tasks = sources.map((src) => async () => {
      outcomes.push(await cutoutOne(sourceDir, cutoutDir, src, fallbackPng));
    });
    await runCutoutPool({ tasks });

    const warnings = outcomes.map((o) => o.warning).filter((w): w is NonNullable<typeof w> => Boolean(w));
    if (warnings.length > 0) {
      // Persist a warning sidecar so strict-qa + phase-notifier can surface
      // backdrop-quality drift to the user.
      writeFileSync(
        join(input.runDir, "cutout-warnings.json"),
        JSON.stringify({ count: warnings.length, warnings }, null, 2),
      );
    }

    return {
      runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: {
        cutoutPaths: outcomes.map((o) => o.cutoutPath).sort(),
        warningCount: warnings.length,
      },
    };
  },
};
