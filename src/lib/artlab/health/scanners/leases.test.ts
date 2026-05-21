import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanLeases } from "./leases";

describe("leases scanner", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-leases-")); });

  it("returns empty when no leases directory exists", () => {
    expect(scanLeases(workspaceRoot)).toEqual([]);
  });

  it("counts active and stale leases across runs", () => {
    const runDir = join(workspaceRoot, "runs", "r1", "slot-leases");
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
    writeFileSync(join(runDir, "s2.lease.json"), JSON.stringify({ acquiredAt: new Date(Date.now() - 30 * 60_000).toISOString() }));
    const leases = scanLeases(workspaceRoot);
    expect(leases.length).toBe(2);
    expect(leases.some((l) => l.stale)).toBe(true);
  });
});
