// src/lib/artlab/runners/concept-critique-blocker.ts
//
// Helper for surfacing concept-critique fallbacks as a loud,
// operator-visible signal. The concept-runner historically swallowed two
// failure modes silently:
//   1. The multimodal critique brain call throws (network/401/5xx).
//   2. Not all 5 lanes have real images (mock-mode lanes counted as
//      placeholders), so the critique never runs.
// Both cases left the run reporting `ok` despite a quality gate being
// missed.
//
// Unit 3 (2026-05-27) split the persistence layer: previously this helper
// also wrote `blocker: "concept-critique-fallback"` directly into the
// run's `run-state.json`, but the deterministic orchestrator immediately
// overwrote that field on the next auto-transition. The fix routes the
// blocker through `ArtLabRunnerResult.blockerHint` so the orchestrator's
// failed-branch persists it via the state-machine-blessed write.
//
// This helper is now a pure side-effect emitter: it only records the
// daemon-error line so `artlab health` + the daemon error tail still
// surface the failure. The runner is responsible for returning the
// blocker on its result.

import type { ArtLabBlocker } from "../types";
import { recordDaemonError } from "../daemon/entry";

export interface ConceptCritiqueFallbackOutcome {
  blocker: ArtLabBlocker;
  failureCode: "concept-critique-skipped";
  reason: string;
}

/**
 * Record a `concept-critique-fallback` daemon-error line + return the
 * blocker descriptor the runner should lift onto its `ArtLabRunnerResult`.
 *
 * Does NOT write `run-state.json`. The orchestrator (`deterministic.ts`)
 * persists the blocker via `result.blockerHint` so the write goes through
 * the state machine instead of racing the auto-transition.
 */
export function recordConceptCritiqueFallback(
  workspaceRoot: string,
  reason: string,
): ConceptCritiqueFallbackOutcome {
  recordDaemonError(workspaceRoot, "concept-critique-fallback", `concept-critique skipped: ${reason}`);
  return {
    blocker: "concept-critique-fallback",
    failureCode: "concept-critique-skipped",
    reason,
  };
}
