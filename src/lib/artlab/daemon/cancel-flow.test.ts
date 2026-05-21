// src/lib/artlab/daemon/cancel-flow.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { processCancelIntents, CANCEL_GRACE_MS } from "./cancel-flow";
import { createSupervisor } from "./supervisor";

describe("cancel flow", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cf-")); });

  it("CANCEL_GRACE_MS is 30 seconds", () => {
    expect(CANCEL_GRACE_MS).toBe(30_000);
  });

  it("sends SIGTERM to the matching active child", async () => {
    const sup = createSupervisor();
    const killFn = vi.fn().mockReturnValue(true);
    sup.registerChild({ runId: "run-1", pid: 42 });
    const kill = vi.fn().mockReturnValue(true);
    mkdirSync(join(workspaceRoot, "inbox"));
    writeFileSync(join(workspaceRoot, "inbox", "cancel-run-1-123.json"), JSON.stringify({ runId: "run-1", requestedAt: "x" }));
    const result = await processCancelIntents({ workspaceRoot, supervisor: sup, kill });
    expect(kill).toHaveBeenCalledWith(42, "SIGTERM");
    expect(result.signaled).toContain("run-1");
  });

  it("removes the cancel intent file after signaling", async () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "run-1", pid: 42 });
    const kill = vi.fn().mockReturnValue(true);
    mkdirSync(join(workspaceRoot, "inbox"));
    const intentPath = join(workspaceRoot, "inbox", "cancel-run-1-123.json");
    writeFileSync(intentPath, JSON.stringify({ runId: "run-1", requestedAt: "x" }));
    await processCancelIntents({ workspaceRoot, supervisor: sup, kill });
    expect(existsSync(intentPath)).toBe(false);
  });

  it("records a no-active-child cancel as 'orphaned'", async () => {
    const sup = createSupervisor();
    const kill = vi.fn();
    mkdirSync(join(workspaceRoot, "inbox"));
    writeFileSync(join(workspaceRoot, "inbox", "cancel-ghost-123.json"), JSON.stringify({ runId: "ghost", requestedAt: "x" }));
    const result = await processCancelIntents({ workspaceRoot, supervisor: sup, kill });
    expect(kill).not.toHaveBeenCalled();
    expect(result.orphaned).toContain("ghost");
  });
});
