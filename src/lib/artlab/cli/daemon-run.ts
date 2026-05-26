// src/lib/artlab/cli/daemon-run.ts
//
// Wires every daemon module into a single context and runs the forever loop.
// This is what `artlab daemon run` invokes (which launchd in turn invokes
// when KeepAlive=true). Before this file existed, `daemon run` was a stub
// that printed "stub" and exited 0; launchd faithfully restarted the no-op
// every 10 seconds forever.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
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
import { createFoundryPoller } from "@/lib/artlab/daemon/foundry-poller";
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
    async answerCallbackQuery() { /* noop */ },
    async editMessageReplyMarkup() { /* noop */ },
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

async function resolveGeminiKey(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    return await getKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-gemini-key`);
  } catch {
    return null;
  }
}

async function resolveAnthropicKey(): Promise<string | null> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    return await getKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-anthropic-key`);
  } catch {
    return null;
  }
}

// Load `<projectRoot>/.env.local` and merge into process.env. The daemon is
// supervised by launchd which only inherits a minimal environment; Next.js's
// own .env.local loader runs only inside `next dev`/`next build`, so the
// daemon process needs to read the file itself. Existing process.env values
// take precedence over .env.local entries.
function loadDotEnvLocal(projectRoot: string): void {
  const path = join(projectRoot, ".env.local");
  if (!existsSync(path)) return;
  try {
    const text = readFileSync(path, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* swallow — daemon should boot even if .env.local is malformed */ }
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

  // entryScript is .../scripts/artlab.ts when invoked via npm/tsx. Project root
  // is two levels up; needed below for .env.local + tsx loader resolution.
  const entryScript = process.argv[1] ?? join(process.cwd(), "scripts", "artlab.ts");
  const projectRoot = dirname(dirname(entryScript));
  loadDotEnvLocal(projectRoot);
  // Make projectRoot available to in-process consumers (engine version
  // capture, promotion-runner auto-commit, brain wiring). Under launchd the
  // plist doesn't set ARTLAB_PROJECT_ROOT so we set it here at boot.
  if (!process.env.ARTLAB_PROJECT_ROOT) {
    process.env.ARTLAB_PROJECT_ROOT = projectRoot;
  }

  const supervisor = createSupervisor();
  const rawBrain: ArtLabLlmBrain = { decide: decideWithMockBrain };
  const brain = createLoggedBrain({ inner: rawBrain, workspaceRoot });
  const token = await resolveTelegramToken();
  const geminiKey = await resolveGeminiKey();
  const anthropicKey = await resolveAnthropicKey();
  const telegramClient = token ? createTelegramClient({ token }) : noopTelegramClient();

  const telegramPoller = createTelegramPoller({
    workspaceRoot,
    client: telegramClient,
    dispatch: ({ message, callbackQuery }) => dispatchInboundMessage({
      workspaceRoot,
      telegram: telegramClient,
      brain,
      message,
      callbackQuery,
    }),
  });

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
      // Pass the resolved Gemini key + parent process env into the worker so
      // it can construct providers without re-reading Keychain (which may
      // require an interactive unlock in launchd contexts).
      const workerEnv: NodeJS.ProcessEnv = {
        ...process.env,
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_PROJECT_ROOT: projectRoot,
      };
      if (geminiKey && !workerEnv.GEMINI_API_KEY) workerEnv.GEMINI_API_KEY = geminiKey;
      if (anthropicKey && !workerEnv.ANTHROPIC_API_KEY) workerEnv.ANTHROPIC_API_KEY = anthropicKey;
      const child = spawn(process.execPath, args, {
        cwd: projectRoot,
        env: workerEnv,
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
    foundryPoller: createFoundryPoller({ workspaceRoot }),
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
    const telegramTokenPresent = !!(await resolveTelegramToken());
    const geminiKeyPresent = !!(await resolveGeminiKey());
    const anthropicKeyPresent = !!(await resolveAnthropicKey());
    input.log(banner({ subtitle: "Daemon running — supervising queue + telegram + cancel + crash-recovery" }));
    input.log("");
    const brainProvider = anthropicKeyPresent
      ? "claude (anthropic) → gemini fallback"
      : geminiKeyPresent
        ? "gemini (reusing image key)"
        : "mock (no key — bible fallback only)";
    const conceptModel = process.env.ARTLAB_CONCEPT_IMAGE_MODEL ?? "gemini-2.5-flash-image";
    const productionModel = process.env.ARTLAB_PRODUCTION_IMAGE_MODEL ?? "nano-banana-pro-preview";
    input.log(box([kvList([
      { label: "workspace", value: input.workspaceRoot },
      { label: "pid", value: String(process.pid) },
      { label: "tick", value: "1000ms" },
      { label: "telegram", value: telegramTokenPresent ? "live" : "noop (no token in env or keychain)", status: telegramTokenPresent ? "ok" : "muted" },
      { label: "concept tier", value: geminiKeyPresent ? `${conceptModel} (cheap exploration)` : "noop (no key)", status: geminiKeyPresent ? "ok" : "muted" },
      { label: "production tier", value: geminiKeyPresent ? `${productionModel} (premium ship)` : "noop (no key)", status: geminiKeyPresent ? "ok" : "muted" },
      { label: "brain", value: brainProvider, status: anthropicKeyPresent || geminiKeyPresent ? "ok" : "muted" },
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
