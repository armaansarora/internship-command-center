import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveOldRuns } from "./run-archival";

describe("archiveOldRuns", () => {
  let workspace: string;
  beforeEach(() => { workspace = mkdtempSync(join(tmpdir(), "artlab-arch-")); });
  afterEach(() => { try { rmSync(workspace, { recursive: true }); } catch { /* ignore */ } });

  function makeRun(runId: string, phase: string, updatedAt: string): string {
    const dir = join(workspace, "runs", runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "run-state.json"), JSON.stringify({
      runId, phase, updatedAt,
    }));
    return dir;
  }

  it("archives a closed run older than 30 days into tar.gz", () => {
    const oldStamp = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const dir = makeRun("ancient-1", "closed", oldStamp);
    writeFileSync(join(dir, "promotion-receipt.json"), JSON.stringify({ ok: true, n: 21 }));
    const result = archiveOldRuns(workspace);
    expect(result.archived).toContain("ancient-1");
    expect(existsSync(dir)).toBe(false);
    const yyyymm = oldStamp.slice(0, 7);
    const archDir = join(workspace, "runs", ".archive", yyyymm);
    expect(existsSync(archDir)).toBe(true);
    const files = readdirSync(archDir);
    expect(files).toContain("ancient-1.tar.gz");
    expect(files).toContain("ancient-1.receipt.json");
  });

  it("skips closed runs younger than 30 days", () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    makeRun("recent-1", "closed", recent);
    const result = archiveOldRuns(workspace);
    expect(result.archived).not.toContain("recent-1");
    expect(result.skipped.some((s) => s.runId === "recent-1" && s.reason === "too-recent")).toBe(true);
  });

  it("never archives non-closed runs (active or blocked)", () => {
    const oldStamp = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    makeRun("active-old", "production", oldStamp);
    const result = archiveOldRuns(workspace);
    expect(result.archived).not.toContain("active-old");
    expect(result.skipped.some((s) => s.runId === "active-old" && s.reason.includes("production"))).toBe(true);
  });

  it("is a no-op when runs dir is missing", () => {
    const result = archiveOldRuns(workspace);
    expect(result.archived).toEqual([]);
  });

  it("ignores .archive directory itself (no re-archiving)", () => {
    const oldStamp = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    mkdirSync(join(workspace, "runs", ".archive", oldStamp.slice(0, 7)), { recursive: true });
    makeRun("real-old", "closed", oldStamp);
    const result = archiveOldRuns(workspace);
    expect(result.archived).toContain("real-old");
    // .archive itself shouldn't appear anywhere in archived/skipped
    expect(result.archived).not.toContain(".archive");
    expect(result.skipped.find((s) => s.runId === ".archive")).toBeUndefined();
  });
});
