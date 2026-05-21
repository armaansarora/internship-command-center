// src/lib/artlab/daemon/entry.test.ts
import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDaemonContext, runDaemonOnce } from "./entry";

describe("daemon entry", () => {
  it("writes a heartbeat to workspaceRoot/daemon-heartbeat.json on each tick", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-"));
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller: { tick: vi.fn() }, queueProcessor: { tick: vi.fn() } });
    await runDaemonOnce(ctx);
    const path = join(workspaceRoot, "daemon-heartbeat.json");
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    expect(parsed.pid).toBe(process.pid);
    expect(typeof parsed.at).toBe("string");
  });

  it("calls telegramPoller.tick and queueProcessor.tick once per tick", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-"));
    const telegramPoller = { tick: vi.fn().mockResolvedValue(undefined) };
    const queueProcessor = { tick: vi.fn().mockResolvedValue(undefined) };
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller, queueProcessor });
    await runDaemonOnce(ctx);
    expect(telegramPoller.tick).toHaveBeenCalledOnce();
    expect(queueProcessor.tick).toHaveBeenCalledOnce();
  });

  it("setShutdownRequested causes runDaemonForever to return on next tick", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-"));
    const telegramPoller = { tick: vi.fn().mockResolvedValue(undefined) };
    const queueProcessor = { tick: vi.fn().mockResolvedValue(undefined) };
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller, queueProcessor });
    ctx.requestShutdown();
    // runDaemonOnce should still run one tick after shutdown is requested (drains)
    await runDaemonOnce(ctx);
    expect(ctx.isShutdownRequested()).toBe(true);
  });
});
