// src/lib/artlab/speed/measure.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { measureWallClock, recordMeasurement, readMeasurements } from "./measure";

describe("speed measurement harness", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-meas-")); });

  it("measureWallClock returns durationMs", async () => {
    const result = await measureWallClock("test-op", async () => {
      await new Promise((r) => setTimeout(r, 25));
      return "x";
    });
    expect(result.label).toBe("test-op");
    expect(result.durationMs).toBeGreaterThanOrEqual(20);
    expect(result.result).toBe("x");
  });

  it("recordMeasurement appends to ledgers/measurements.jsonl", async () => {
    await recordMeasurement({ workspaceRoot, label: "concept-runner", durationMs: 4200, runId: "r1" });
    const path = join(workspaceRoot, "ledgers", "measurements.jsonl");
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf8").trim());
    expect(parsed.label).toBe("concept-runner");
    expect(parsed.durationMs).toBe(4200);
  });

  it("readMeasurements filters by label", async () => {
    await recordMeasurement({ workspaceRoot, label: "concept-runner", durationMs: 4000, runId: "r1" });
    await recordMeasurement({ workspaceRoot, label: "production-runner", durationMs: 60000, runId: "r1" });
    await recordMeasurement({ workspaceRoot, label: "concept-runner", durationMs: 3500, runId: "r2" });
    const conceptOnly = await readMeasurements({ workspaceRoot, label: "concept-runner" });
    expect(conceptOnly).toHaveLength(2);
    expect(conceptOnly.map((m) => m.durationMs)).toEqual([4000, 3500]);
  });
});
