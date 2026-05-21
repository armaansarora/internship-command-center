import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const TARGET_LANES = 5;

async function generateMockConceptSlot(runDir: string, laneIndex: number): Promise<string> {
  const dir = join(runDir, "concept-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `lane-${laneIndex}.json`);
  const delayMs = Number.parseInt(process.env.ARTLAB_CONCEPT_LANE_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  writeFileSync(path, JSON.stringify({ laneIndex, mock: true, generatedAt: new Date().toISOString() }));
  return path;
}

export const conceptRunner: ArtLabRunner = {
  kind: "concept",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: {}, blockerHint: "cancelled", failureCode: "aborted",
      };
    }
    // SPEED: Phase 5 — five lanes run in parallel via Promise.all.
    // Each lane writes its own file under concept-slots/; no shared mutable state.
    const laneIndexes = Array.from({ length: TARGET_LANES }, (_, i) => i + 1);
    const slotOutputs = await Promise.all(laneIndexes.map((idx) => generateMockConceptSlot(input.runDir, idx)));
    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: { slotOutputs }, blockerHint: "cancelled", failureCode: "aborted",
      };
    }
    const conceptBoardPath = join(input.runDir, "concept-board.json");
    writeFileSync(
      conceptBoardPath,
      JSON.stringify({
        runId: input.runId,
        characterId: input.characterId,
        lanes: slotOutputs.map((path, idx) => ({ laneIndex: idx + 1, slotPath: path })),
        createdAt: new Date().toISOString(),
      }),
    );
    return {
      runnerKind: "concept", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, conceptBoardPath },
    };
  },
};
