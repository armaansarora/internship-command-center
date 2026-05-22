// src/lib/artlab/daemon/unattended-smoke.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileCrashedRuns } from "./crash-recovery";

describe("daemon unattended smoke — simulate daemon restart mid-run", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-unattended-")); });

  it("runs with stale heartbeats are reconciled and leases released", async () => {
    // Simulate: daemon was running a Rafe-style production, then crashed 12 minutes ago.
    const runDir = join(workspaceRoot, "runs", "rafe-overnight");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
      runId: "rafe-overnight", assetType: "character", phase: "production",
      createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      request: "make Rafe Calder",
    }));
    writeFileSync(join(runDir, "progress.json"), JSON.stringify({
      runId: "rafe-overnight",
      at: new Date(Date.now() - 12 * 60_000).toISOString(),
      phase: "production",
      slotsCompleted: 14, slotsRunning: 2, slotsFailed: 0,
      actualSpendCents: 800, reservedCents: 200,
    }));
    for (let i = 1; i <= 2; i += 1) {
      writeFileSync(join(runDir, "slot-leases", `slot-${i}.lease.json`), JSON.stringify({ slotId: `slot-${i}` }));
    }
    const result = await reconcileCrashedRuns({ workspaceRoot });
    expect(result.staleRunsReconciled).toContain("rafe-overnight");
    expect(result.leasesReleased.length).toBe(2);
    expect(existsSync(join(runDir, "slot-leases", "slot-1.lease.json"))).toBe(false);
  });
});
