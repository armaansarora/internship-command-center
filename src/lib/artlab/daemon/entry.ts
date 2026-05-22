// src/lib/artlab/daemon/entry.ts
import { appendFileSync, mkdirSync, existsSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

export interface DaemonTicker {
  tick(): Promise<void>;
}

export interface DaemonCancelDrain {
  processCancelIntents(): Promise<unknown>;
}

export interface DaemonCrashRecovery {
  reconcile(): Promise<unknown>;
}

export interface DaemonSleepGuard {
  activate(): void;
  deactivate(): void;
  isActive(): boolean;
}

export interface DaemonCliInboxBridge {
  drain(): Promise<unknown>;
}

export interface DaemonSupervisorView {
  activeChildren(): readonly unknown[];
}

export interface DaemonContextInput {
  workspaceRoot: string;
  telegramPoller: DaemonTicker;
  queueProcessor: DaemonTicker;
  cliInboxBridge?: DaemonCliInboxBridge;
  cancelDrain?: DaemonCancelDrain;
  crashRecovery?: DaemonCrashRecovery;
  crashRecoveryIntervalMs?: number;
  sleepGuard?: DaemonSleepGuard;
  supervisor?: DaemonSupervisorView;
  now?: () => Date;
}

export interface DaemonContext {
  workspaceRoot: string;
  telegramPoller: DaemonTicker;
  queueProcessor: DaemonTicker;
  cliInboxBridge?: DaemonCliInboxBridge;
  cancelDrain?: DaemonCancelDrain;
  crashRecovery?: DaemonCrashRecovery;
  crashRecoveryIntervalMs: number;
  sleepGuard?: DaemonSleepGuard;
  supervisor?: DaemonSupervisorView;
  now: () => Date;
  lastCrashRecoveryAt: number;
  requestShutdown(): void;
  isShutdownRequested(): boolean;
}

export function createDaemonContext(input: DaemonContextInput): DaemonContext {
  let shutdown = false;
  return {
    workspaceRoot: input.workspaceRoot,
    telegramPoller: input.telegramPoller,
    queueProcessor: input.queueProcessor,
    cliInboxBridge: input.cliInboxBridge,
    cancelDrain: input.cancelDrain,
    crashRecovery: input.crashRecovery,
    crashRecoveryIntervalMs: input.crashRecoveryIntervalMs ?? 60_000,
    sleepGuard: input.sleepGuard,
    supervisor: input.supervisor,
    now: input.now ?? (() => new Date()),
    lastCrashRecoveryAt: 0,
    requestShutdown(): void { shutdown = true; },
    isShutdownRequested(): boolean { return shutdown; },
  };
}

function writeHeartbeat(workspaceRoot: string): void {
  if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });
  const path = join(workspaceRoot, "daemon-heartbeat.json");
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString() }, null, 2)}\n`);
  renameSync(tmp, path);
}

export function recordDaemonError(workspaceRoot: string, source: string, err: unknown): void {
  try {
    if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      source,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    appendFileSync(join(workspaceRoot, "daemon-errors.jsonl"), `${line}\n`);
  } catch { /* never let logging crash the daemon */ }
}

async function runStep(workspaceRoot: string, source: string, fn: () => Promise<unknown>): Promise<void> {
  try { await fn(); } catch (err) { recordDaemonError(workspaceRoot, source, err); }
}

export async function runDaemonOnce(ctx: DaemonContext): Promise<void> {
  writeHeartbeat(ctx.workspaceRoot);

  if (ctx.cancelDrain) {
    await runStep(ctx.workspaceRoot, "cancel-drain", () => ctx.cancelDrain!.processCancelIntents());
  }

  if (ctx.cliInboxBridge) {
    await runStep(ctx.workspaceRoot, "cli-inbox-bridge", () => ctx.cliInboxBridge!.drain());
  }

  if (ctx.crashRecovery) {
    const nowMs = ctx.now().getTime();
    if (nowMs - ctx.lastCrashRecoveryAt >= ctx.crashRecoveryIntervalMs) {
      ctx.lastCrashRecoveryAt = nowMs;
      await runStep(ctx.workspaceRoot, "crash-recovery", () => ctx.crashRecovery!.reconcile());
    }
  }

  if (ctx.sleepGuard && ctx.supervisor) {
    const hasChildren = ctx.supervisor.activeChildren().length > 0;
    if (hasChildren && !ctx.sleepGuard.isActive()) ctx.sleepGuard.activate();
    else if (!hasChildren && ctx.sleepGuard.isActive()) ctx.sleepGuard.deactivate();
  }

  await runStep(ctx.workspaceRoot, "telegram-poller", () => ctx.telegramPoller.tick());
  await runStep(ctx.workspaceRoot, "queue-processor", () => ctx.queueProcessor.tick());
}

export async function runDaemonForever(ctx: DaemonContext, opts?: { sleepMs?: number }): Promise<void> {
  const sleepMs = opts?.sleepMs ?? 1000;
  const onSignal = () => ctx.requestShutdown();
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  try {
    while (!ctx.isShutdownRequested()) {
      await runStep(ctx.workspaceRoot, "daemon-tick", () => runDaemonOnce(ctx));
      if (ctx.isShutdownRequested()) break;
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  } finally {
    process.off("SIGTERM", onSignal);
    process.off("SIGINT", onSignal);
    if (ctx.sleepGuard?.isActive()) ctx.sleepGuard.deactivate();
  }
}
