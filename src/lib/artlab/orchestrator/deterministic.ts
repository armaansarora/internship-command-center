import type { ArtLabPhase } from "../types";
import { ARTLAB_TRANSITIONS } from "../state/machine";
import { readRunStateSnapshot, writeRunStateSnapshot } from "../state/snapshots";
import { appendArtLabEvent } from "../state/events";
import { getRunner } from "../runners";
import type { ArtLabRunnerKind } from "../runners/runner-contract";

const PHASE_RUNNER: Partial<Record<ArtLabPhase, ArtLabRunnerKind>> = {
  "generating-concepts": "concept",
  canary: "canary",
  production: "production",
  "strict-qa": "strict-qa",
  promoting: "promotion",
  verifying: "verifying",
};

const NEXT_PHASE: Partial<Record<ArtLabPhase, ArtLabPhase>> = {
  routed: "generating-concepts",
  "generating-concepts": "concept-review",
  canary: "production",
  production: "strict-qa",
  "strict-qa": "final-review",
  promoting: "verifying",
  verifying: "closed",
};

export interface DeterministicTransitionInput {
  runDir: string;
  providerId: "gemini-api" | "local-mock";
}

export interface DeterministicTransitionOutcome {
  applied: boolean;
  reason?: string;
  fromPhase?: ArtLabPhase;
  toPhase?: ArtLabPhase;
}

export async function runDeterministicTransition(input: DeterministicTransitionInput): Promise<DeterministicTransitionOutcome> {
  const state = readRunStateSnapshot(input.runDir);
  if (!state) return { applied: false, reason: "no-state" };
  if (state.phase === "closed") return { applied: false, reason: "terminal" };
  if (state.phase === "concept-review" || state.phase === "final-review") {
    return { applied: false, reason: "awaiting-human-gate" };
  }
  if (state.blocker) return { applied: false, reason: `blocked-${state.blocker}` };
  const runnerKind = PHASE_RUNNER[state.phase];
  if (runnerKind) {
    const runner = getRunner(runnerKind);
    const result = await runner.run({
      runId: state.runId,
      runDir: input.runDir,
      assetType: state.assetType,
      characterId: state.characterId,
      approvedLaneIndex: state.approvedConcept?.laneIndex,
      providerId: input.providerId,
    });
    appendArtLabEvent(input.runDir, {
      runId: state.runId,
      at: new Date().toISOString(),
      kind: "runner-completed",
      payload: { runnerKind, status: result.status, durationMs: result.durationMs },
    });
    if (result.status === "failed" && result.blockerHint) {
      writeRunStateSnapshot(input.runDir, { ...state, blocker: result.blockerHint, updatedAt: new Date().toISOString() });
      return { applied: false, reason: `runner-failed-${result.failureCode ?? "unknown"}`, fromPhase: state.phase };
    }
  }
  const next = NEXT_PHASE[state.phase];
  if (!next) return { applied: false, reason: "no-next-phase" };
  const transition = ARTLAB_TRANSITIONS.find((t) => t.from === state.phase && t.to === next);
  if (!transition) return { applied: false, reason: "no-transition-defined" };
  const updated = await transition.apply(state, { workspaceRoot: input.runDir, now: () => new Date() });
  writeRunStateSnapshot(input.runDir, updated);
  appendArtLabEvent(input.runDir, {
    runId: state.runId,
    at: updated.updatedAt,
    kind: "phase-transition",
    payload: { from: state.phase, to: next },
  });
  return { applied: true, fromPhase: state.phase, toPhase: next };
}
