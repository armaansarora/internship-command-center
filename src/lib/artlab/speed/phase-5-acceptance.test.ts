// src/lib/artlab/speed/phase-5-acceptance.test.ts
import { describe, expect, it } from "vitest";
import { readBaseline } from "@/lib/artlab/migration/baseline-recorder";
import { readMeasurements } from "./measure";

// =============================================================================
// POST-/goal ARTIFACT — runs in Appendix D Post-/goal Manual Validation, never
// during /goal execution.
//
// Same three-layer protection as Task 4.11 — see that file's comment for the
// detailed rationale.
// =============================================================================
describe.skip("Phase 5 acceptance — Rafe-rerun ≥ 40% faster than baseline", () => {
  it("median post-Phase-5 rafe-run measurement beats the baseline by ≥ 40%", async () => {
    if (process.env.ARTLAB_ALLOW_REAL_MONEY_VALIDATION !== "yes") {
      throw new Error(
        "Refusing to assert Phase 5 acceptance without explicit consent. " +
        "This test requires ≥ 3 real Rafe-rerun measurements (each costs real " +
        "Gemini API spend). Follow Appendix D of the plan to record those runs " +
        "and set ARTLAB_ALLOW_REAL_MONEY_VALIDATION=yes before un-skipping.",
      );
    }
    const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine";
    const baseline = await readBaseline({ workspaceRoot, label: "phase-4-rafe-baseline" });
    expect(baseline).toBeTruthy();
    const measurements = await readMeasurements({ workspaceRoot, label: "rafe-run" });
    expect(measurements.length).toBeGreaterThanOrEqual(3);
    const recentMs = measurements.slice(-3).map((m) => m.durationMs).sort((a, b) => a - b);
    const median = recentMs[1]!;
    const improvement = ((baseline!.wallClockMs - median) / baseline!.wallClockMs) * 100;
    expect(improvement).toBeGreaterThanOrEqual(40);
  }, 60_000);
});
