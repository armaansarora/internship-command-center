// src/lib/artlab/daemon/entry.ts
import { appendFileSync, mkdirSync, existsSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { rotateDaemonLogs } from "./log-rotation";
import { archiveOldRuns } from "./run-archival";

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

export interface DaemonCliInboxConsumer {
  drain(): Promise<unknown>;
}

export interface DaemonArtLabPoller {
  tick(): Promise<unknown>;
}

export interface DaemonSupervisorView {
  activeChildren(): readonly unknown[];
}

export interface DaemonContextInput {
  workspaceRoot: string;
  telegramPoller: DaemonTicker;
  queueProcessor: DaemonTicker;
  cliInboxBridge?: DaemonCliInboxBridge;
  cliInboxConsumer?: DaemonCliInboxConsumer;
  artLabPoller?: DaemonArtLabPoller;
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
  cliInboxConsumer?: DaemonCliInboxConsumer;
  artLabPoller?: DaemonArtLabPoller;
  cancelDrain?: DaemonCancelDrain;
  crashRecovery?: DaemonCrashRecovery;
  crashRecoveryIntervalMs: number;
  sleepGuard?: DaemonSleepGuard;
  supervisor?: DaemonSupervisorView;
  now: () => Date;
  lastCrashRecoveryAt: number;
  lastLogRotationAt: number;
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
    cliInboxConsumer: input.cliInboxConsumer,
    artLabPoller: input.artLabPoller,
    cancelDrain: input.cancelDrain,
    crashRecovery: input.crashRecovery,
    crashRecoveryIntervalMs: input.crashRecoveryIntervalMs ?? 60_000,
    sleepGuard: input.sleepGuard,
    supervisor: input.supervisor,
    now: input.now ?? (() => new Date()),
    lastCrashRecoveryAt: 0,
    lastLogRotationAt: 0,
    requestShutdown(): void { shutdown = true; },
    isShutdownRequested(): boolean { return shutdown; },
  };
}

const LOG_ROTATION_INTERVAL_MS = 60_000;
const RUN_ARCHIVAL_INTERVAL_MS = 60 * 60_000; // hourly
const SHUTDOWN_DRAIN_MS = 30_000;
const SHUTDOWN_POLL_MS = 500;

let lastRunArchivalAt = 0;

// Captured once at boot so /health can answer "did my changes deploy?" with
// a single line instead of forcing the operator to ssh + git log.
let cachedEngineVersion: string | null = null;
let cachedEngineVersionAt: string | null = null;

function captureEngineVersion(): void {
  const projectRoot = process.env.ARTLAB_PROJECT_ROOT;
  if (!projectRoot) return;
  try {
    const sha = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: projectRoot, encoding: "utf8" });
    if (sha.status === 0) cachedEngineVersion = sha.stdout.trim() || null;
    const at = spawnSync("git", ["log", "-1", "--format=%cI"], { cwd: projectRoot, encoding: "utf8" });
    if (at.status === 0) cachedEngineVersionAt = at.stdout.trim() || null;
  } catch { /* git missing or repo absent — version stays null */ }
}

function writeHeartbeat(workspaceRoot: string): void {
  if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });
  const path = join(workspaceRoot, "daemon-heartbeat.json");
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify({
    pid: process.pid,
    at: new Date().toISOString(),
    engineVersion: cachedEngineVersion ?? undefined,
    engineVersionAt: cachedEngineVersionAt ?? undefined,
  }, null, 2)}\n`);
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

  // Log rotation runs at most once per minute; cheap when files are small.
  const nowMs = ctx.now().getTime();
  if (nowMs - ctx.lastLogRotationAt >= LOG_ROTATION_INTERVAL_MS) {
    ctx.lastLogRotationAt = nowMs;
    await runStep(ctx.workspaceRoot, "log-rotation", async () => rotateDaemonLogs(ctx.workspaceRoot));
  }

  // Hourly: archive completed runs older than 30 days into tar.gz.
  if (nowMs - lastRunArchivalAt >= RUN_ARCHIVAL_INTERVAL_MS) {
    lastRunArchivalAt = nowMs;
    await runStep(ctx.workspaceRoot, "run-archival", async () => archiveOldRuns(ctx.workspaceRoot));
  }

  if (ctx.cancelDrain) {
    await runStep(ctx.workspaceRoot, "cancel-drain", () => ctx.cancelDrain!.processCancelIntents());
  }

  if (ctx.cliInboxBridge) {
    await runStep(ctx.workspaceRoot, "cli-inbox-bridge", () => ctx.cliInboxBridge!.drain());
  }

  // Drain per-run cli-inbox/ answers AFTER the bridge has landed continue/answer
  // intents into runs/<runId>/cli-inbox/. Routing in the bridge is the
  // demux; consumption here is the advance. Wrapped in runStep so any throw
  // (filesystem race, advance-helper failure) lands in daemon-errors.jsonl
  // instead of crashing the daemon loop.
  if (ctx.cliInboxConsumer) {
    await runStep(ctx.workspaceRoot, "cli-inbox-consumer", () => ctx.cliInboxConsumer!.drain());
  }

  // ArtLab MCP inbox → ArtLab queue. Must drain BEFORE the queue processor
  // ticks so newly arrived `artlab/generate` jobs spawn workers on the
  // same tick (mirrors the cli-inbox-bridge → queue-processor ordering).
  if (ctx.artLabPoller) {
    await runStep(ctx.workspaceRoot, "sdk-poller", () => ctx.artLabPoller!.tick());
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
  // Snapshot the engine version once at boot so /health can answer
  // "what's deployed?" without forking git on every snapshot.
  captureEngineVersion();
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
    // Drain child workers gracefully so they don't leave mid-write state.
    await drainChildren(ctx);
  } finally {
    process.off("SIGTERM", onSignal);
    process.off("SIGINT", onSignal);
    if (ctx.sleepGuard?.isActive()) ctx.sleepGuard.deactivate();
  }
}

/**
 * After shutdown is requested, SIGTERM each child worker and wait up to
 * SHUTDOWN_DRAIN_MS for them to exit (poll every 500ms). Force-kill any
 * stragglers with SIGKILL to guarantee daemon exit.
 */
async function drainChildren(ctx: DaemonContext): Promise<void> {
  const supervisor = ctx.supervisor;
  if (!supervisor) return;
  const children = supervisor.activeChildren() as Array<{ pid?: unknown }>;
  if (children.length === 0) return;
  for (const child of children) {
    if (typeof child.pid === "number") {
      try { process.kill(child.pid, "SIGTERM"); } catch { /* already dead */ }
    }
  }
  const deadline = Date.now() + SHUTDOWN_DRAIN_MS;
  while (Date.now() < deadline) {
    if (supervisor.activeChildren().length === 0) return;
    await new Promise((r) => setTimeout(r, SHUTDOWN_POLL_MS));
  }
  // Time's up — force kill any remaining children.
  for (const child of supervisor.activeChildren() as Array<{ pid?: unknown }>) {
    if (typeof child.pid === "number") {
      try { process.kill(child.pid, "SIGKILL"); } catch { /* already dead */ }
    }
  }
}
