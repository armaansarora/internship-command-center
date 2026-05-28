// src/lib/artlab/speed/phase-5-acceptance.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readBaseline, recordBaseline } from "@/lib/artlab/migration/baseline-recorder";
import { readMeasurements, recordMeasurement } from "./measure";
import { buildArtLabHealthSnapshot } from "@/lib/artlab/health/snapshot";

// =============================================================================
// POST-/goal ARTIFACT — runs in Appendix D Post-/goal Manual Validation, never
// during /goal execution.
//
// Same three-layer protection as Task 4.11 — see that file's comment for the
// detailed rationale.
// =============================================================================
describe.skip("live spend — Phase 5 acceptance: Rafe-rerun ≥ 40% faster than baseline", () => {
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

// -----------------------------------------------------------------------------
// Shape test — no live spend. Builds a synthetic workspace with handcrafted
// baseline + measurement fixtures, then asserts the perf-snapshot JSON shape
// emitted by `buildArtLabHealthSnapshot`. Catches schema drift in the speed
// summary contract without asserting the 40% improvement (that lives in the
// describe.skip block above).
// -----------------------------------------------------------------------------
describe("shape — phase-5 perf snapshot has the expected fields", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-phase5-shape-"));
  });

  it("speed summary has baseline + current + improvement + run-count fields with correct types", async () => {
    // Record a synthetic baseline via the production writer.
    mkdirSync(join(workspaceRoot, "runs", "rafe-fixture"), { recursive: true });
    const events = [
      { runId: "rafe-fixture", at: "2026-05-20T01:00:00.000Z", kind: "phase-transition", payload: { from: "routed", to: "generating-concepts" } },
      { runId: "rafe-fixture", at: "2026-05-20T01:20:00.000Z", kind: "phase-transition", payload: { from: "verifying", to: "closed" } },
    ];
    writeFileSync(join(workspaceRoot, "runs", "rafe-fixture", "events.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    await recordBaseline({ workspaceRoot, runId: "rafe-fixture", label: "phase-4-rafe-baseline" });

    // Record three synthetic post-Phase-5 measurements (improvements pretend
    // the runner is now ~50% faster). No live spend — we're asserting shape,
    // not the 40% target.
    await recordMeasurement({ workspaceRoot, label: "rafe-run", durationMs: 600_000, runId: "post-1" });
    await recordMeasurement({ workspaceRoot, label: "rafe-run", durationMs: 580_000, runId: "post-2" });
    await recordMeasurement({ workspaceRoot, label: "rafe-run", durationMs: 620_000, runId: "post-3" });

    const snapshot = await buildArtLabHealthSnapshot({ workspaceRoot });
    expect(snapshot.speed).toBeDefined();
    const speed = snapshot.speed!;

    // Exact field names — drift here breaks the health CLI renderer and the
    // describe.skip live-spend acceptance test above.
    expect(typeof speed.baselineRunMs).toBe("number");
    expect(typeof speed.medianRecentRunMs).toBe("number");
    expect(typeof speed.improvementPercent).toBe("number");
    expect(typeof speed.recentRunCount).toBe("number");

    // Sanity bounds — values are derivable from the fixtures.
    expect(speed.baselineRunMs).toBeGreaterThan(0);
    expect(speed.medianRecentRunMs).toBeGreaterThan(0);
    expect(speed.recentRunCount).toBe(3);
    // The fixture has baseline=1_200_000ms and median=600_000ms, so improvement
    // should be 50% — but we don't assert ≥ 40% here. Just that the field is
    // a finite number (the live test owns the 40% threshold).
    expect(Number.isFinite(speed.improvementPercent)).toBe(true);
  });

  it("speed summary is undefined when no measurements are recorded", async () => {
    const snapshot = await buildArtLabHealthSnapshot({ workspaceRoot });
    expect(snapshot.speed).toBeUndefined();
  });

  it("measurement entries have the expected shape", async () => {
    await recordMeasurement({
      workspaceRoot,
      label: "rafe-run",
      durationMs: 480_000,
      runId: "shape-1",
      meta: { modelUsed: "gemini-2.5-flash-image" },
    });
    const measurements = await readMeasurements({ workspaceRoot, label: "rafe-run" });
    expect(measurements).toHaveLength(1);
    const m = measurements[0]!;
    expect(typeof m.label).toBe("string");
    expect(typeof m.durationMs).toBe("number");
    expect(typeof m.at).toBe("string");
    expect(m.runId).toBe("shape-1");
    expect(m.meta?.modelUsed).toBe("gemini-2.5-flash-image");
  });
});
