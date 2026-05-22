// src/lib/artlab/cli/daemon-run.ts
//
// Wires every daemon module into a single context and runs the forever loop.
// This is what `artlab daemon run` invokes (which launchd in turn invokes
// when KeepAlive=true). Before this file existed, `daemon run` was a stub
// that printed "stub" and exited 0; launchd faithfully restarted the no-op
// every 10 seconds forever.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

export interface DaemonRunInput {
  workspaceRoot: string;
  log(line: string): void;
  buildContext?: (input: { workspaceRoot: string }) => DaemonContext;
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

export function buildProductionDaemonContext(input: { workspaceRoot: string }): DaemonContext {
  const { workspaceRoot } = input;
  if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });

  const supervisor = createSupervisor();
  const rawBrain: ArtLabLlmBrain = { decide: decideWithMockBrain };
  const brain = createLoggedBrain({ inner: rawBrain, workspaceRoot });
  const token = process.env.TELEGRAM_BOT_TOKEN;
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

  const queueProcessor = createQueueProcessor({
    workspaceRoot,
    supervisor,
    spawnRunner: (entry) => {
      const runRoot = join(workspaceRoot, "runs", entry.runId);
      if (!existsSync(runRoot)) mkdirSync(runRoot, { recursive: true });
      writeFileSync(join(runRoot, "queue-entry.json"), JSON.stringify(entry, null, 2));
      const entryScript = process.argv[1] ?? join(process.cwd(), "scripts", "artlab.ts");
      return spawn(process.execPath, [entryScript, "run-worker", entry.runId], {
        env: { ...process.env, ARTLAB_WORKSPACE_ROOT: workspaceRoot },
        stdio: ["ignore", "ignore", "ignore"],
        detached: false,
      });
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
    const ctx = build({ workspaceRoot: input.workspaceRoot });
    input.log(banner({ subtitle: "Daemon running — supervising queue + telegram + cancel + crash-recovery" }));
    input.log("");
    input.log(box([kvList([
      { label: "workspace", value: input.workspaceRoot },
      { label: "pid", value: String(process.pid) },
      { label: "tick", value: "1000ms" },
      { label: "telegram", value: process.env.TELEGRAM_BOT_TOKEN ? "live" : "noop (no TELEGRAM_BOT_TOKEN)", status: process.env.TELEGRAM_BOT_TOKEN ? "ok" : "muted" },
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
