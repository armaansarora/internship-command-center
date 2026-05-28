// src/lib/artlab/daemon/queue-processor.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createQueueProcessor } from "./queue-processor";
import { createSupervisor } from "./supervisor";
import { enqueueRun, inflightCount, listQueuedRuns } from "@/lib/artlab/queue/queue";

describe("queue processor", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-qp-")); });

  it("does nothing when supervisor is full", async () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "x", pid: 1 });
    sup.registerChild({ runId: "y", pid: 2 });
    const spawn = vi.fn();
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "queued", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    await proc.tick();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("spawns a child for the highest-priority queued run", async () => {
    const sup = createSupervisor();
    const spawn = vi.fn().mockReturnValue({ pid: 9999, kill: vi.fn() });
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "low", priority: "default", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "x" } });
    enqueueRun(workspaceRoot, { runId: "high", priority: "human-flagged", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    await proc.tick();
    expect(spawn).toHaveBeenCalledOnce();
    const [opts] = spawn.mock.calls[0]!;
    expect(opts.runId).toBe("high");
    expect(sup.activeChildren()).toHaveLength(1);
  });

  it("releases the slot when child exits", async () => {
    const sup = createSupervisor();
    let exitHandler: ((code: number) => void) | null = null;
    const spawn = vi.fn().mockReturnValue({
      pid: 1234,
      on: vi.fn().mockImplementation((event, h) => {
        if (event === "exit") exitHandler = h;
      }),
      kill: vi.fn(),
    });
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "alpha", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    await proc.tick();
    expect(sup.activeChildren()).toHaveLength(1);
    // Inflight is cleared once supervisor accepted the child.
    expect(inflightCount(workspaceRoot)).toBe(0);
    expect(existsSync(join(workspaceRoot, "queue", "inflight", "alpha.json"))).toBe(false);
    exitHandler!(0);
    expect(sup.activeChildren()).toHaveLength(0);
  });

  it("rename-backs the inflight file to the queue when spawnRunner throws", async () => {
    const sup = createSupervisor();
    const spawn = vi.fn().mockImplementation(() => { throw new Error("spawn boom"); });
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "rerun", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    await proc.tick();
    // Supervisor never accepted a child.
    expect(sup.activeChildren()).toHaveLength(0);
    // The job MUST still be readable as queued — the daemon will retry next tick.
    const list = listQueuedRuns(workspaceRoot);
    expect(list.map((q) => q.runId)).toEqual(["rerun"]);
    // And the inflight directory is empty after requeue.
    expect(inflightCount(workspaceRoot)).toBe(0);
  });

  it("rename-backs the inflight file when supervisor rejects the registration", async () => {
    // Force supervisor to be full so registerChild returns { accepted: false }.
    const sup = createSupervisor();
    sup.registerChild({ runId: "x", pid: 1 });
    sup.registerChild({ runId: "y", pid: 2 });
    const childKill = vi.fn();
    const spawn = vi.fn().mockReturnValue({ pid: 9999, kill: childKill });
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "rejected", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    // canSpawn=false → spawn never called, so inflight should be untouched.
    // To exercise the "registration race lost" branch instead, drop the
    // children inside the spawn function so canSpawn passes the first check
    // but registration fails. Easier: simulate by removing children first.
    sup.releaseChild("x");
    sup.releaseChild("y");
    // Now canSpawn is true, but we want supervisor to reject. Re-fill in spawn:
    spawn.mockImplementationOnce(() => {
      sup.registerChild({ runId: "x", pid: 1 });
      sup.registerChild({ runId: "y", pid: 2 });
      return { pid: 9999, kill: childKill };
    });
    await proc.tick();
    expect(listQueuedRuns(workspaceRoot).map((q) => q.runId)).toEqual(["rejected"]);
    expect(inflightCount(workspaceRoot)).toBe(0);
    expect(childKill).toHaveBeenCalledWith("SIGTERM");
  });
});
