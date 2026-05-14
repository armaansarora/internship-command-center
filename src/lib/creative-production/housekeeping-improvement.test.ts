import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHousekeepingEntry,
  createImprovementEntry,
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
