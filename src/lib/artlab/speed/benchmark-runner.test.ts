// src/lib/artlab/speed/benchmark-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMockBenchmark } from "./benchmark-runner";

describe("daily benchmark runner", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-bench-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
  });

  it("emits a benchmark entry to ledgers/measurements.jsonl", async () => {
    process.env.ARTLAB_CONCEPT_LANE_DELAY_MS = "5";
    process.env.ARTLAB_CUTOUT_DELAY_MS = "5";
    const result = await runMockBenchmark({ workspaceRoot });
    delete process.env.ARTLAB_CONCEPT_LANE_DELAY_MS;
    delete process.env.ARTLAB_CUTOUT_DELAY_MS;
    expect(result.label).toBe("daily-mock-benchmark");
    expect(result.durationMs).toBeGreaterThan(0);
  });
});
