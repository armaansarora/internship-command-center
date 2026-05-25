// src/lib/artlab/cli/daemon-run.ts
//
// Wires every daemon module into a single context and runs the forever loop.
// This is what `artlab daemon run` invokes (which launchd in turn invokes
// when KeepAlive=true). Before this file existed, `daemon run` was a stub
// that printed "stub" and exited 0; launchd faithfully restarted the no-op
// every 10 seconds forever.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createDaemonContext,
  recordDaemonError,
  runDaemonForever,
  type DaemonContext,
} from "@/lib/artlab/daemon/entry";
import { createTelegramPoller } from "@/lib/artlab/daemon/telegram-poller";
import { createQueueProcessor } from "@/lib/artlab/daemon/queue-processor";
import { createSupervisor } from "@/lib/artlab/daemon/supervisor";
import { processCancelIntents } from "@/lib/artlab/daemon/cancel-flow";
import { reconcileCrashedRuns } from "@/lib/artlab/daemon/crash-recovery";
import { createSleepGuard } from "@/lib/artlab/daemon/sleep-guard";
import { createCliInboxBridge } from "@/lib/artlab/daemon/cli-inbox-bridge";
import { dispatchInboundMessage } from "@/lib/artlab/bot/bot-dispatcher";
import { createTelegramClient, type TelegramClient } from "@/lib/artlab/bot/telegram-client";
import { decideWithMockBrain, type ArtLabLlmBrain } from "@/lib/artlab/orchestrator/llm-brain";
import { createLoggedBrain } from "@/lib/artlab/orchestrator/logged-brain";
import { getKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";
import { notifyPhase } from "@/lib/artlab/daemon/phase-notifier";

export interface DaemonRunInput {
  workspaceRoot: string;
  log(line: string): void;
  buildContext?: (input: { workspaceRoot: string }) => DaemonContext | Promise<DaemonContext>;
  runForever?: (ctx: DaemonContext) => Promise<void>;
}

function noopTelegramClient(): TelegramClient {
  return {
    async getUpdates() { return []; },
    async sendMessage() { return { message_id: 0 }; },
    async sendMediaGroup() { return []; },
    async downloadFile() { return { contentType: "application/octet-stream", bytes: Buffer.alloc(0) }; },
  };
}

async function resolveTelegramToken(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
  try {
    return await getKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`);
  } catch {
    return null;
  }
}

function findTsxLoaderPath(projectRoot: string): string | undefined {
  const candidates = [
    join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs"),
    join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return undefined;
}

export async function buildProductionDaemonContext(input: { workspaceRoot: string }): Promise<DaemonContext> {
  const { workspaceRoot } = input;
  if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });

  const supervisor = createSupervisor();
  const rawBrain: ArtLabLlmBrain = { decide: decideWithMockBrain };
  const brain = createLoggedBrain({ inner: rawBrain, workspaceRoot });
  const token = await resolveTelegramToken();
  const telegramClient = token ? createTelegramClient({ token }) : noopTelegramClient();

  const telegramPoller = createTelegramPoller({
    workspaceRoot,
    client: telegramClient,
    dispatch: ({ message }) => dispatchInboundMessage({
      workspaceRoot,
      telegram: telegramClient,
      brain,
      message,
    }),
  });

  // entryScript is .../scripts/artlab.ts when invoked via npm/tsx. The
  // project root (which holds node_modules and tsconfig.json) is two levels up.
  const entryScript = process.argv[1] ?? join(process.cwd(), "scripts", "artlab.ts");
  const projectRoot = dirname(dirname(entryScript));
  const tsxLoaderPath = findTsxLoaderPath(projectRoot);
  const queueProcessor = createQueueProcessor({
    workspaceRoot,
    supervisor,
    spawnRunner: (entry) => {
      const runRoot = join(workspaceRoot, "runs", entry.runId);
      if (!existsSync(runRoot)) mkdirSync(runRoot, { recursive: true });
      writeFileSync(join(runRoot, "queue-entry.json"), JSON.stringify(entry, null, 2));
      const args = tsxLoaderPath
        ? [tsxLoaderPath, entryScript, "run-worker", entry.runId]
        : [entryScript, "run-worker", entry.runId];
      const workerOutFd = openSync(join(runRoot, "worker.out.log"), "a");
      const workerErrFd = openSync(join(runRoot, "worker.err.log"), "a");
      const child = spawn(process.execPath, args, {
        cwd: projectRoot,
        env: { ...process.env, ARTLAB_WORKSPACE_ROOT: workspaceRoot },
        stdio: ["ignore", workerOutFd, workerErrFd],
        detached: false,
      });
      child.on("exit", () => {
        // Post-worker notification: read run-state.json + queue-entry.chatId and
        // push the appropriate board / status message back to Telegram.
        void notifyPhase({ workspaceRoot, runId: entry.runId, telegram: telegramClient })
          .catch((err) => recordDaemonError(workspaceRoot, "phase-notifier", err));
      });
      return child;
    },
  });

  return createDaemonContext({
    workspaceRoot,
    telegramPoller,
    queueProcessor,
    cancelDrain: { processCancelIntents: () => processCancelIntents({ workspaceRoot, supervisor }) },
    crashRecovery: { reconcile: () => reconcileCrashedRuns({ workspaceRoot }) },
    sleepGuard: createSleepGuard({}),
    cliInboxBridge: createCliInboxBridge({ workspaceRoot }),
    supervisor,
  });
}

export async function runDaemonRunSubcommand(input: DaemonRunInput): Promise<number> {
  const build = input.buildContext ?? buildProductionDaemonContext;
  const loop = input.runForever ?? runDaemonForever;
  const { banner } = await import("./ui/widgets");
  const { box } = await import("./ui/box");
  const { kvList } = await import("./ui/widgets");
  const { gold, muted } = await import("./ui/widgets");
  try {
    const ctx = await build({ workspaceRoot: input.workspaceRoot });
    const telegramTokenPresent = !!(process.env.TELEGRAM_BOT_TOKEN ?? await getKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`).catch(() => null));
    input.log(banner({ subtitle: "Daemon running — supervising queue + telegram + cancel + crash-recovery" }));
    input.log("");
    input.log(box([kvList([
      { label: "workspace", value: input.workspaceRoot },
      { label: "pid", value: String(process.pid) },
      { label: "tick", value: "1000ms" },
      { label: "telegram", value: telegramTokenPresent ? "live" : "noop (no token in env or keychain)", status: telegramTokenPresent ? "ok" : "muted" },
    ])], { title: "Daemon configuration" }));
    input.log("");
    input.log(`${gold("●")} daemon online — Ctrl-C to stop`);
    await loop(ctx);
    input.log("");
    input.log(muted("◌ daemon shutdown complete"));
    return 0;
  } catch (err) {
    recordDaemonError(input.workspaceRoot, "daemon-run-bootstrap", err);
    input.log(`artlab daemon: bootstrap failed — see ${join(input.workspaceRoot, "daemon-errors.jsonl")}`);
    return 1;
  }
}
