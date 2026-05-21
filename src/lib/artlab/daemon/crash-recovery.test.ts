// src/lib/artlab/daemon/crash-recovery.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileCrashedRuns } from "./crash-recovery";

describe("crash recovery", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cr-")); });

  it("releases stale leases (heartbeat > 10 min old)", async () => {
    const runDir = join(workspaceRoot, "runs", "stale-run");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
      runId: "stale-run", assetType: "character", phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    writeFileSync(join(runDir, "progress.json"), JSON.stringify({
      runId: "stale-run", at: new Date(Date.now() - 11 * 60_000).toISOString(),
      phase: "production", slotsCompleted: 5, slotsRunning: 1, slotsFailed: 0,
      actualSpendCents: 100, reservedCents: 50,
    }));
    writeFileSync(join(runDir, "slot-leases", "slot-1.lease.json"), JSON.stringify({ slotId: "slot-1" }));
    const result = await reconcileCrashedRuns({ workspaceRoot });
    expect(result.staleRunsReconciled).toContain("stale-run");
    expect(existsSync(join(runDir, "slot-leases", "slot-1.lease.json"))).toBe(false);
  });

  it("leaves healthy runs alone (heartbeat < 10 min)", async () => {
    const runDir = join(workspaceRoot, "runs", "healthy-run");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
      runId: "healthy-run", assetType: "character", phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    writeFileSync(join(runDir, "progress.json"), JSON.stringify({
      runId: "healthy-run", at: new Date(Date.now() - 30_000).toISOString(),
      phase: "production", slotsCompleted: 5, slotsRunning: 1, slotsFailed: 0,
      actualSpendCents: 100, reservedCents: 50,
    }));
    writeFileSync(join(runDir, "slot-leases", "slot-1.lease.json"), JSON.stringify({ slotId: "slot-1" }));
    const result = await reconcileCrashedRuns({ workspaceRoot });
    expect(result.staleRunsReconciled).not.toContain("healthy-run");
    expect(existsSync(join(runDir, "slot-leases", "slot-1.lease.json"))).toBe(true);
  });
});
