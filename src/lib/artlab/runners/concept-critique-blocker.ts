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

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabBlocker } from "../types";
import { recordDaemonError } from "../daemon/entry";
import { appendRejection } from "../memory/rejection-ledger";

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
 *
 * Unit 4 — also writes a `style-rejections.jsonl` entry so the brain has a
 * taste-decision feed in addition to the error telemetry. The rejection
 * ledger is independent of the daemon-error feed: this is "a quality gate
 * was skipped" surfaced to the next refinement round, NOT a duplicate of
 * `recordDaemonError`.
 */
export function recordConceptCritiqueFallback(
  workspaceRoot: string,
  reason: string,
  opts: { characterId?: string } = {},
): ConceptCritiqueFallbackOutcome {
  recordDaemonError(workspaceRoot, "concept-critique-fallback", `concept-critique skipped: ${reason}`);
  if (opts.characterId) {
    try {
      const memoryDir = join(workspaceRoot, "memory");
      if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
      appendRejection(memoryDir, {
        at: new Date().toISOString(),
        characterId: opts.characterId,
        reason: "critique-skipped",
        codes: ["brain-failure"],
        source: "character",
      });
    } catch {
      // Best-effort — never let a memory-write IO failure rewrite the
      // outcome the caller relies on. recordDaemonError already covers the
      // operator-visible signal.
    }
  }
  return {
    blocker: "concept-critique-fallback",
    failureCode: "concept-critique-skipped",
    reason,
  };
}
