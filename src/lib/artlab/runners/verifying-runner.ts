import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const verifyingRunner: ArtLabRunner = {
  kind: "verifying",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const mode = process.env.ARTLAB_PLAYWRIGHT_MODE ?? "real";
    if (mode === "mock") {
      const failFlag = join(input.runDir, "playwright-force-fail.flag");
      if (existsSync(failFlag)) {
        return {
          runnerKind: "verifying",
          status: "failed",
          durationMs: Date.now() - startedAt,
          artifacts: { mode },
          failureCode: "playwright-forced-failure",
        };
      }
      const evidencePath = join(input.runDir, "playwright-evidence.json");
      writeFileSync(evidencePath, JSON.stringify({ mode: "mock", at: new Date().toISOString() }));
      return {
        runnerKind: "verifying",
        status: "ok",
        durationMs: Date.now() - startedAt,
        artifacts: { mode, evidencePath },
      };
    }
    return {
      runnerKind: "verifying",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { mode },
    };
  },
};
