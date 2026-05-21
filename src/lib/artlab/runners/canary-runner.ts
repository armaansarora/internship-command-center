import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const canaryRunner: ArtLabRunner = {
  kind: "canary",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (typeof input.approvedLaneIndex !== "number") {
      return {
        runnerKind: "canary",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: {},
        failureCode: "missing-approved-lane",
      };
    }
    const slotPath = join(input.runDir, "canary-slot.json");
    writeFileSync(slotPath, JSON.stringify({ laneIndex: input.approvedLaneIndex, mock: true }));
    const gatePath = join(input.runDir, "canary-gate.json");
    writeFileSync(
      gatePath,
      JSON.stringify({
        runId: input.runId,
        laneIndex: input.approvedLaneIndex,
        cutoutPassed: true,
        decidedAt: new Date().toISOString(),
      }),
    );
    return {
      runnerKind: "canary",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotPath, gatePath },
    };
  },
};
