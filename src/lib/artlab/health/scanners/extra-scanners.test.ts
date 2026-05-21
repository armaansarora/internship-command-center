import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanProcesses } from "./processes";
import { scanReceipts } from "./receipts";
import { scanLocks } from "./locks";
import { scanCleanup } from "./cleanup";

describe("supplementary health scanners", () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "artlab-scan-")); });

  it("scanProcesses counts active leases as live processes", () => {
    const leaseDir = join(root, "runs", "r1", "slot-leases");
    mkdirSync(leaseDir, { recursive: true });
    writeFileSync(join(leaseDir, "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
    const result = scanProcesses(root);
    expect(result.activeProcessCount).toBeGreaterThanOrEqual(1);
  });

  it("scanReceipts counts receipts per run", () => {
    const inbox = join(root, "runs", "r1", "inbox");
    mkdirSync(inbox, { recursive: true });
    writeFileSync(join(inbox, "api-receipt-1.json"), JSON.stringify({}));
    writeFileSync(join(inbox, "api-receipt-2.json"), JSON.stringify({}));
    const result = scanReceipts(root);
    expect(result.byRun.r1).toBe(2);
    expect(result.totalReceipts).toBe(2);
  });

  it("scanLocks finds .lock files", () => {
    writeFileSync(join(root, ".lock.engine.json"), JSON.stringify({ pid: process.pid }));
    const result = scanLocks(root);
    expect(result.locks.some((l) => l.scope === "engine")).toBe(true);
  });

  it("scanCleanup detects orphan previews", () => {
    const previews = join(root, "runs", "r1", "previews-orphan");
    mkdirSync(previews, { recursive: true });
    writeFileSync(join(previews, "leftover.png"), "x");
    const result = scanCleanup(root);
    expect(result.orphanPreviewCount).toBeGreaterThanOrEqual(1);
  });
});
