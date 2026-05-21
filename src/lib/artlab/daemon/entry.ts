// src/lib/artlab/daemon/entry.ts
import { mkdirSync, existsSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

export interface DaemonTicker {
  tick(): Promise<void>;
}

export interface DaemonContextInput {
  workspaceRoot: string;
  telegramPoller: DaemonTicker;
  queueProcessor: DaemonTicker;
}

export interface DaemonContext {
  workspaceRoot: string;
  telegramPoller: DaemonTicker;
  queueProcessor: DaemonTicker;
  requestShutdown(): void;
  isShutdownRequested(): boolean;
}

export function createDaemonContext(input: DaemonContextInput): DaemonContext {
  let shutdown = false;
  return {
    workspaceRoot: input.workspaceRoot,
    telegramPoller: input.telegramPoller,
    queueProcessor: input.queueProcessor,
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

export async function runDaemonOnce(ctx: DaemonContext): Promise<void> {
  writeHeartbeat(ctx.workspaceRoot);
  await Promise.all([
    ctx.telegramPoller.tick(),
    ctx.queueProcessor.tick(),
  ]);
}

export async function runDaemonForever(ctx: DaemonContext, opts?: { sleepMs?: number }): Promise<void> {
  const sleepMs = opts?.sleepMs ?? 1000;
  const onSignal = () => ctx.requestShutdown();
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  try {
    while (!ctx.isShutdownRequested()) {
      try {
        await runDaemonOnce(ctx);
      } catch {
        // never let a tick error kill the daemon
      }
      if (ctx.isShutdownRequested()) break;
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  } finally {
    process.off("SIGTERM", onSignal);
    process.off("SIGINT", onSignal);
  }
}
