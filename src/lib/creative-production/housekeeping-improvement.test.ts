import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHousekeepingEntry,
  createImprovementEntry,
  summarizeCreativeImprovementLoop,
  shouldTriggerEngineUpgrade,
  validateRequiredPhaseGates,
  writeJsonlEntry,
} from "./index";

describe("creative production gates", () => {
  it("requires every phase to record organization and cleanup", () => {
    const entry = createHousekeepingEntry({
      runId: "run-1",
      phase: "brainstorm",
      created: ["concept-board-prompt.md"],
      kept: ["concept-board-prompt.md"],
      archived: [],
      deleted: [],
      notes: "No loose files created.",
    });

    expect(entry.gate).toBe("housekeeping");
    expect(entry.status).toBe("passed");
    expect(entry.created).toEqual(["concept-board-prompt.md"]);
    expect(entry.kept).toEqual(["concept-board-prompt.md"]);
  });

  it("records improvement signals and triggers v2 review when repeated friction appears", () => {
    const entries = [
      createImprovementEntry({
        runId: "a",
        phase: "generation",
        category: "manual-step",
        severity: "medium",
        finding: "Manual file labeling repeated.",
        action: "Add ingest label command.",
      }),
      createImprovementEntry({
        runId: "b",
        phase: "generation",
        category: "manual-step",
        severity: "medium",
        finding: "Manual file labeling repeated again.",
        action: "Upgrade required.",
      }),
      createImprovementEntry({
        runId: "c",
        phase: "qa",
        category: "quality-failure",
        severity: "high",
        finding: "Alpha haloing not caught early.",
        action: "Add preflight alpha check.",
      }),
    ];

    expect(shouldTriggerEngineUpgrade(entries)).toBe(true);
  });

  it("turns fifth-run friction into concrete engine upgrade actions", () => {
    const entries = [
      createImprovementEntry({
        runId: "run-1",
        phase: "generation",
        category: "manual-step",
        severity: "medium",
        finding: "Manual slot labeling slowed the run.",
        action: "Automate slot labeling.",
      }),
      createImprovementEntry({
        runId: "run-2",
        phase: "generation",
        category: "manual-step",
        severity: "medium",
        finding: "Manual retry bookkeeping slowed the run.",
        action: "Automate retry bookkeeping.",
      }),
      createImprovementEntry({
        runId: "run-3",
        phase: "qa",
        category: "quality-failure",
        severity: "medium",
        finding: "Alpha warnings appeared too late.",
        action: "Move alpha checks earlier.",
      }),
      createImprovementEntry({
        runId: "run-4",
        phase: "qa",
        category: "quality-failure",
        severity: "high",
        finding: "Low-resolution source reached final review.",
        action: "Block low-resolution sources before review.",
      }),
      createImprovementEntry({
        runId: "run-5",
        phase: "generation",
        category: "manual-step",
        severity: "medium",
        finding: "Manual prompt copying repeated.",
        action: "Generate prompt decks automatically.",
      }),
    ];

    const summary = summarizeCreativeImprovementLoop(entries);

    expect(summary.runsObserved).toBe(5);
    expect(summary.maturityStage).toBe("upgrade-required");
    expect(summary.upgradeRequired).toBe(true);
    expect(summary.repeatedCategories).toContainEqual({
      category: "manual-step",
      count: 3,
    });
    expect(summary.nextActions.join(" ")).toContain("manual-step");
    expect(summary.nextActions.join(" ")).toContain("before continuing production");
  });

  it("escalates repeated medium quality failures before they become normal", () => {
    const entries = [
      createImprovementEntry({
        runId: "otis-run-1",
        phase: "qa",
        category: "quality-failure",
        severity: "medium",
        finding: "Provider returned fake alpha instead of a flat matte.",
        action: "Add a stricter alpha gate.",
      }),
      createImprovementEntry({
        runId: "otis-run-2",
        phase: "qa",
        category: "quality-failure",
        severity: "medium",
        finding: "Alpha extraction rejected every lane again.",
        action: "Upgrade the production source workflow.",
      }),
    ];

    const summary = summarizeCreativeImprovementLoop(entries);

    expect(shouldTriggerEngineUpgrade(entries)).toBe(true);
    expect(summary.upgradeRequired).toBe(true);
    expect(summary.maturityStage).toBe("upgrade-required");
    expect(summary.nextActions.join(" ")).toContain("quality-failure");
  });

  it("resets the active friction window after an engine upgrade entry", () => {
    const summary = summarizeCreativeImprovementLoop([
      createImprovementEntry({
        runId: "run-1",
        phase: "generation",
        category: "workflow",
        severity: "high",
        finding: "Browser generation was too manual.",
        action: "Build an API runner.",
      }),
      createImprovementEntry({
        runId: "run-2",
        phase: "continuous-improvement",
        category: "engine-upgrade",
        severity: "low",
        finding: "API runner now has locks, retries, budget projection, and state.",
        action: "Resume production with the hardened runner.",
      }),
    ]);

    expect(summary.entriesSinceLastUpgrade).toBe(0);
    expect(summary.upgradeRequired).toBe(false);
    expect(summary.maturityStage).toBe("learning");
  });

  it("writes JSONL ledgers for auditability", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-gates-"));
    const ledgerPath = join(root, "improvements.jsonl");
    const entry = createImprovementEntry({
      runId: "run-1",
      phase: "qa",
      category: "slow",
      severity: "low",
      finding: "Review board took too long to inspect.",
      action: "Add thumbnail index.",
    });

    await writeJsonlEntry(ledgerPath, entry);

    expect(readFileSync(ledgerPath, "utf8")).toContain("\"gate\":\"continuous-improvement\"");
  });

  it("fails a phase when either required gate is missing", () => {
    const result = validateRequiredPhaseGates("run-1", "qa", [
      createHousekeepingEntry({
        runId: "run-1",
        phase: "qa",
        created: [],
        kept: [],
        archived: [],
        deleted: [],
        notes: "Clean.",
      }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["continuous-improvement"]);
  });
});
