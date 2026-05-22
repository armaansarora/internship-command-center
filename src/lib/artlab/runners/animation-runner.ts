// src/lib/artlab/runners/animation-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ANIMATION_CONTRACT } from "@/lib/artlab/contracts/animation-contract";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const DEFAULT_FRAME_COUNT = 24;

export const animationRunner: ArtLabRunner = {
  kind: "production",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const slotsDir = join(input.runDir, "production-slots");
    const framesDir = join(slotsDir, "frames");
    if (!existsSync(framesDir)) mkdirSync(framesDir, { recursive: true });
    const frames = Array.from({ length: DEFAULT_FRAME_COUNT }, (_, i) => i + 1);
    // SPEED: per-frame parallelism
    const framePaths = await Promise.all(
      frames.map(async (idx) => {
        const path = join(framesDir, `frame-${String(idx).padStart(3, "0")}.json`);
        writeFileSync(path, JSON.stringify({ frame: idx, mock: true }));
        return path;
      }),
    );
    const spriteSheetPath = join(slotsDir, "sprite-sheet.json");
    writeFileSync(spriteSheetPath, JSON.stringify({
      runId: input.runId, frames: framePaths.sort(), fps: ANIMATION_CONTRACT.fps, mock: true,
    }));
    const posterPath = join(slotsDir, "reduced-motion-poster.json");
    writeFileSync(posterPath, JSON.stringify({
      runId: input.runId, fallbackFor: spriteSheetPath, mock: true,
    }));
    return {
      runnerKind: "production", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { framePaths, spriteSheetPath, posterPath, frameCount: DEFAULT_FRAME_COUNT },
    };
  },
};
