// src/lib/artlab/runners/environment-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ENVIRONMENT_CONTRACT } from "@/lib/artlab/contracts/environment-contract";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const environmentRunner: ArtLabRunner = {
  kind: "production",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const dir = join(input.runDir, "production-slots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const slotOutputs: string[] = [];
    // SPEED: 4-variant parallelism (small; just Promise.all)
    await Promise.all(
      ENVIRONMENT_CONTRACT.requiredSlots.map(async (timeOfDay) => {
        const path = join(dir, `${timeOfDay}.json`);
        writeFileSync(path, JSON.stringify({
          slotId: `${input.runId}-${timeOfDay}`,
          timeOfDay,
          aspectRatio: ENVIRONMENT_CONTRACT.aspectRatio,
          noCharacters: ENVIRONMENT_CONTRACT.noCharacters,
          mock: true,
        }));
        slotOutputs.push(path);
      }),
    );
    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs: slotOutputs.sort(), slotCount: 4 },
    };
  },
};
