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

  it("composes cancel-drain, cli-inbox-bridge, crash-recovery, and sleep-guard when provided", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-comp-"));
    const cancelDrain = { processCancelIntents: vi.fn().mockResolvedValue({ signaled: [], orphaned: [] }) };
    const cliInboxBridge = { drain: vi.fn().mockResolvedValue({ enqueuedRunIds: [], continueIntents: 0, answerIntents: 0 }) };
    const crashRecovery = { reconcile: vi.fn().mockResolvedValue({ staleRunsReconciled: [], leasesReleased: [] }) };
    const sleepGuardState = { active: false };
    const sleepGuard = {
      activate: vi.fn(() => { sleepGuardState.active = true; }),
      deactivate: vi.fn(() => { sleepGuardState.active = false; }),
      isActive: vi.fn(() => sleepGuardState.active),
    };
    const supervisor = { activeChildren: vi.fn(() => [{ runId: "x", pid: 123 }]) };
    const ctx = createDaemonContext({
      workspaceRoot,
      telegramPoller: { tick: vi.fn().mockResolvedValue(undefined) },
      queueProcessor: { tick: vi.fn().mockResolvedValue(undefined) },
      cancelDrain,
      cliInboxBridge,
      crashRecovery,
      crashRecoveryIntervalMs: 0,
      sleepGuard,
      supervisor,
    });
    await runDaemonOnce(ctx);
    expect(cancelDrain.processCancelIntents).toHaveBeenCalledOnce();
    expect(cliInboxBridge.drain).toHaveBeenCalledOnce();
    expect(crashRecovery.reconcile).toHaveBeenCalledOnce();
    expect(sleepGuard.activate).toHaveBeenCalledOnce(); // children present → guard activates
  });

  it("logs structured errors to daemon-errors.jsonl instead of swallowing silently", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-err-"));
    const telegramPoller = { tick: vi.fn().mockRejectedValue(new Error("network down")) };
    const queueProcessor = { tick: vi.fn().mockResolvedValue(undefined) };
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller, queueProcessor });
    await runDaemonOnce(ctx);
    expect(queueProcessor.tick).toHaveBeenCalledOnce(); // queue still runs even when telegram fails
    const errPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errPath)).toBe(true);
    const lines = readFileSync(errPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.some((l) => l.source === "telegram-poller" && l.message.includes("network down"))).toBe(true);
  });

  it("respects crashRecoveryIntervalMs cadence", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-cr-"));
    const crashRecovery = { reconcile: vi.fn().mockResolvedValue({ staleRunsReconciled: [], leasesReleased: [] }) };
    let nowMs = 1_000_000_000_000;
    const ctx = createDaemonContext({
      workspaceRoot,
      telegramPoller: { tick: vi.fn().mockResolvedValue(undefined) },
      queueProcessor: { tick: vi.fn().mockResolvedValue(undefined) },
      crashRecovery,
      crashRecoveryIntervalMs: 60_000,
      now: () => new Date(nowMs),
    });
    await runDaemonOnce(ctx); // first tick: runs
    nowMs += 1000;
    await runDaemonOnce(ctx); // 1s later: skipped (still within window)
    nowMs += 60_000;
    await runDaemonOnce(ctx); // 61s later: runs
    expect(crashRecovery.reconcile).toHaveBeenCalledTimes(2);
  });
});
