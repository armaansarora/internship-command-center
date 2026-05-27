// src/lib/artlab/runners/concept-critique-blocker.ts
//
// Helper for surfacing concept-critique fallbacks as a loud, operator-visible
// blocker. The concept-runner historically swallowed two failure modes
// silently:
//   1. The multimodal critique brain call throws (network/401/5xx).
//   2. Not all 5 lanes have real images (mock-mode lanes counted as
//      placeholders), so the critique never runs.
// Both cases left the run reporting `ok` despite a quality gate being
// missed. This helper makes the fallback observable by:
//   • Writing `blocker: "concept-critique-fallback"` into the run's
//     `run-state.json` (so /status renders ⚠️ blocked + hint).
//   • Appending a `{ at, source, message }` entry to
//     `<workspaceRoot>/daemon-errors.jsonl` so the failure shows up in
//     `artlab health` and the daemon error tail.
//
// Both writes are best-effort and tolerate a missing run-state (the
// run may have errored before run-state was seeded).

import { readRunStateSnapshot, writeRunStateSnapshot } from "../state/snapshots";
import { recordDaemonError } from "../daemon/entry";

export function writeConceptCritiqueFallbackBlocker(
  workspaceRoot: string,
  runDir: string,
  reason: string,
): void {
  // 1. Best-effort: bump run-state.json with the blocker code so /status
  //    surfaces the ⚠️ blocked: concept-critique-fallback line.
  try {
    const existing = readRunStateSnapshot(runDir);
    if (existing) {
      writeRunStateSnapshot(runDir, {
        ...existing,
        blocker: "concept-critique-fallback",
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {
    // Run-state I/O errors must not crash the runner — the daemon-errors
    // line below is the durable signal regardless.
  }

  // 2. Append a daemon-error entry via the shared helper so `scanDaemonErrors`
  //    picks it up in the health view. Passing a string keeps `stack: undefined`
  //    (dropped by JSON.stringify) so the on-disk shape matches the inline
  //    version this replaced.
  recordDaemonError(workspaceRoot, "concept-critique-fallback", `concept-critique skipped: ${reason}`);
}
