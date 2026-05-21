import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildArtLabHealthSnapshot } from "./snapshot";

describe("artlab health snapshot", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-health-")); });

  it("returns real numbers across all 6 scanners", async () => {
    const runDir = join(workspaceRoot, "runs", "r1");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "slot-leases", "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
    writeFileSync(join(runDir, "provider-budget-ledger.json"), JSON.stringify({ totals: { spentCents: 500 } }));
    const snap = await buildArtLabHealthSnapshot(workspaceRoot);
    expect(snap.leases.length).toBe(1);
    expect(snap.spend.totalSpentCents).toBe(500);
    expect(snap.processes.activeProcessCount).toBe(1);
    expect(snap.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
