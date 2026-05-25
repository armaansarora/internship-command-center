import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderPlaceholderImage } from "../speed/placeholder-images";
import { displayFor } from "../intake/known-cast";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const TARGET_LANES = 5;

interface ConceptSlotOutputs { jsonPath: string; pngPath: string; }

async function generateMockConceptSlot(runDir: string, characterId: string | undefined, laneIndex: number): Promise<ConceptSlotOutputs> {
  const dir = join(runDir, "concept-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, `lane-${laneIndex}.json`);
  const pngPath = join(dir, `lane-${laneIndex}.png`);
  const delayMs = Number.parseInt(process.env.ARTLAB_CONCEPT_LANE_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  writeFileSync(jsonPath, JSON.stringify({ laneIndex, mock: true, alpha: true, generatedAt: new Date().toISOString() }));
  const display = displayFor(characterId);
  const png = await renderPlaceholderImage({
    title: display.firstName,
    subtitle: `Direction ${laneIndex} · concept lane`,
    laneIndex,
  });
  writeFileSync(pngPath, png);
  return { jsonPath, pngPath };
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
    // Each lane writes its own files under concept-slots/; no shared mutable state.
    const laneIndexes = Array.from({ length: TARGET_LANES }, (_, i) => i + 1);
    const slotOutputs = await Promise.all(
      laneIndexes.map((idx) => generateMockConceptSlot(input.runDir, input.characterId, idx)),
    );
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
        lanes: slotOutputs.map(({ jsonPath, pngPath }, idx) => ({ laneIndex: idx + 1, jsonPath, pngPath })),
        createdAt: new Date().toISOString(),
      }),
    );
    return {
      runnerKind: "concept", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, conceptBoardPath },
    };
  },
};
