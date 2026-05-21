// src/lib/artlab/daemon/queue-processor.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createQueueProcessor } from "./queue-processor";
import { createSupervisor } from "./supervisor";
import { enqueueRun } from "@/lib/artlab/queue/queue";

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
    exitHandler!(0);
    expect(sup.activeChildren()).toHaveLength(0);
  });
});
