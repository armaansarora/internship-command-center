// src/lib/artlab/health/snapshot.speed.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildArtLabHealthSnapshot } from "./snapshot";

describe("health snapshot — speed summary (Phase 5)", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-hs-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
    writeFileSync(join(workspaceRoot, "ledgers", "measurements.jsonl"), [
      JSON.stringify({ label: "rafe-run", durationMs: 1320000, at: "2026-05-20T00:00:00Z" }),
      JSON.stringify({ label: "rafe-run", durationMs: 700000, at: "2026-05-21T00:00:00Z" }),
    ].join("\n") + "\n");
    writeFileSync(join(workspaceRoot, "ledgers", "baselines.jsonl"), JSON.stringify({
      label: "phase-4-rafe-baseline", runId: "rafe-001", wallClockMs: 1320000,
      startedAt: "x", endedAt: "y", recordedAt: "z",
    }) + "\n");
  });

  it("snapshot.speed.medianRunMs is computed from measurements", async () => {
    const snapshot = await buildArtLabHealthSnapshot({ workspaceRoot });
    expect(snapshot.speed?.medianRecentRunMs).toBeGreaterThan(0);
    expect(snapshot.speed?.baselineRunMs).toBe(1320000);
    expect(snapshot.speed?.improvementPercent).toBeGreaterThanOrEqual(40);
  });
});
