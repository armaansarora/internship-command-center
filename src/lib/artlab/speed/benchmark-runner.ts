import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conceptRunner } from "@/lib/artlab/runners/concept-runner";
import { cutoutRunner } from "@/lib/artlab/runners/cutout-runner";
import { measureWallClock, recordMeasurement } from "./measure";

export interface MockBenchmarkResult {
  label: "daily-mock-benchmark";
  durationMs: number;
  conceptMs: number;
  cutoutMs: number;
}

export async function runMockBenchmark(input: { workspaceRoot: string }): Promise<MockBenchmarkResult> {
  const runDir = mkdtempSync(join(tmpdir(), "artlab-bm-"));
  const conceptMeasurement = await measureWallClock("concept", () => conceptRunner.run({
    runId: "bm",
    runDir,
    assetType: "character",
    characterId: "bm",
    providerId: "local-mock",
  }));
  const cutoutMeasurement = await measureWallClock("cutout", () => cutoutRunner.run({
    runId: "bm",
    runDir,
    assetType: "character",
    providerId: "local-mock",
  }));
  const total = conceptMeasurement.durationMs + cutoutMeasurement.durationMs;
  await recordMeasurement({ workspaceRoot: input.workspaceRoot, label: "daily-mock-benchmark", durationMs: total });
  return {
    label: "daily-mock-benchmark",
    durationMs: total,
    conceptMs: conceptMeasurement.durationMs,
    cutoutMs: cutoutMeasurement.durationMs,
  };
}
