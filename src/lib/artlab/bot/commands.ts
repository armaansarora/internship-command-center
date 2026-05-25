import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readRunReality } from "../state/reconciler";
import { listQueuedRuns } from "../queue/queue";
import { buildArtLabHealthSnapshot } from "../health/snapshot";
import { loadTowerContext } from "../context/tower-context";
import { createClaudeBrain } from "../orchestrator/claude-brain";
import { createGeminiBrain } from "../orchestrator/gemini-brain";
import { createLoggedBrain } from "../orchestrator/logged-brain";
import { decideWithMockBrain, type ArtLabLlmBrain } from "../orchestrator/llm-brain";
import {
  askAnswerTemplate,
  cancelAck,
  decisionsTemplate,
  healthSnapshot,
  helpTemplate,
  queueList,
  statusList,
  statusOne,
  unknownCommandTemplate,
  type TelegramOutboundMessage,
} from "./message-templates";

export interface BotCommandInput {
  workspaceRoot: string;
  commandName: string;
  args: string[];
  chatId?: number;
}

export interface BotCommandResult {
  kind: "text";
  message: TelegramOutboundMessage;
}

const KNOWN = ["status", "queue", "cancel", "health", "help", "decisions", "ask"] as const;

async function handleStatus(workspaceRoot: string, args: string[]): Promise<TelegramOutboundMessage> {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return statusList({ runs: [] });
  const runs = readdirSync(runsDir).filter((f) => !f.startsWith("."));
  if (args.length === 0) return statusList({ runs });
  const runId = args[0]!;
  const reality = await readRunReality(join(runsDir, runId));
  if (!reality) return { text: `🤷 No run found for <code>${runId.slice(0, 8)}</code>.`, parseMode: "HTML" };
  return statusOne({
    runId,
    phase: reality.phase,
    blocker: reality.blocker ?? undefined,
    slots: reality.slots,
    spend: reality.spend,
    progress: {
      phaseElapsedMs: reality.progress.phaseElapsedMs,
      estimatedRemainingMs: reality.progress.estimatedRemainingMs,
      expectedSlotCount: reality.progress.expectedSlotCount,
      renderedSlotCount: reality.progress.renderedSlotCount,
    },
  });
}

function handleQueue(workspaceRoot: string): TelegramOutboundMessage {
  const queued = listQueuedRuns(workspaceRoot);
  return queueList({ entries: queued });
}

function handleCancel(workspaceRoot: string, args: string[], chatId?: number): TelegramOutboundMessage {
  // /cancel with no arg → cancel ALL parked runs for the calling chat.
  // /cancel <runId> → cancel just that one.
  if (args.length === 0) {
    if (typeof chatId === "number") {
      // Lazy-load to avoid a circular import (commands.ts ↔ brief-advance.ts).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { cancelAllParkedRunsForChat } = require("./brief-advance") as typeof import("./brief-advance");
      const count = cancelAllParkedRunsForChat(workspaceRoot, chatId);
      if (count === 0) {
        return { text: "📭 <b>Nothing parked.</b>  No runs to cancel.", parseMode: "HTML" };
      }
      return {
        text: `🛑  <b>Cancelled ${count} parked run${count === 1 ? "" : "s"}.</b>  Clean slate.`,
        parseMode: "HTML",
      };
    }
    return { text: "❌ Usage: <code>/cancel</code> (all parked) or <code>/cancel &lt;runId&gt;</code>", parseMode: "HTML" };
  }
  const runId = args[0]!;
  const inboxDir = join(workspaceRoot, "inbox");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  // Dedup: if a cancel intent for this runId already exists in the inbox
  // (queued from a previous /cancel), don't spam another file. The daemon
  // will process the existing one on the next sweep.
  if (cancelIntentExists(inboxDir, runId)) {
    return cancelAck({ runId });
  }
  const path = join(inboxDir, `cancel-${runId}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ runId, requestedAt: new Date().toISOString() }));
  return cancelAck({ runId });
}

function cancelIntentExists(inboxDir: string, runId: string): boolean {
  if (!existsSync(inboxDir)) return false;
  try {
    return readdirSync(inboxDir).some((f) => f.startsWith(`cancel-${runId}-`) && f.endsWith(".json"));
  } catch { return false; }
}

async function handleHealth(workspaceRoot: string): Promise<TelegramOutboundMessage> {
  const snapshot = await buildArtLabHealthSnapshot(workspaceRoot);
  return healthSnapshot({
    activeLocks: snapshot.locks.locks.length,
    activeRuns: snapshot.processes.activeProcessCount,
    activeLeases: snapshot.leases.length,
    monthlySpendCents: snapshot.spend.totalSpentCents,
    collectedAt: snapshot.collectedAt,
    daemonErrors24h: snapshot.daemon.recent24hCount,
    lastDaemonError: snapshot.daemon.lastError,
    heartbeatStaleMs: snapshot.daemon.heartbeat?.staleMs,
    engineVersion: snapshot.daemon.engineVersion,
    engineVersionAt: snapshot.daemon.engineVersionAt,
  });
}

// Flat decision-log entry shape (matches what logged-brain writes via
// appendLlmDecision). The legacy `entry.runId` filter was buggy — entries
// don't carry runId. We now filter by timestamp window from the run's
// own createdAt/updatedAt so /decisions <runId> shows the decisions that
// landed during that run's lifetime.
interface DecisionLogEntry {
  decisionAt?: string;
  kind?: string;
  input?: unknown;
  output?: Record<string, unknown>;
  tokensIn?: number;
  tokensOut?: number;
  retryCount?: number;
  validationError?: string;
}

interface RunStateLite { runId: string; createdAt: string; updatedAt: string }

function readRunWindow(workspaceRoot: string, runId: string): { startMs: number; endMs: number } | null {
  try {
    const statePath = join(workspaceRoot, "runs", runId, "run-state.json");
    if (!existsSync(statePath)) return null;
    const parsed = JSON.parse(readFileSync(statePath, "utf8")) as RunStateLite;
    const start = new Date(parsed.createdAt).getTime() - 30_000;
    const end = new Date(parsed.updatedAt).getTime() + 30_000;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return { startMs: start, endMs: end };
  } catch { return null; }
}

function handleDecisions(workspaceRoot: string, args: string[]): TelegramOutboundMessage {
  if (args.length === 0) {
    return { text: "❌ Usage: <code>/decisions &lt;runId&gt;</code>", parseMode: "HTML" };
  }
  const wantedRunId = args[0]!;
  const logPath = join(workspaceRoot, "memory", "decision-log.jsonl");
  if (!existsSync(logPath)) {
    return decisionsTemplate({ runId: wantedRunId, decisions: [] });
  }
  // Resolve the run's full UUID from the short prefix to read its time window.
  const runsDir = join(workspaceRoot, "runs");
  const fullRunId = existsSync(runsDir)
    ? readdirSync(runsDir).find((d) => d.startsWith(wantedRunId.slice(0, 8))) ?? wantedRunId
    : wantedRunId;
  const window = readRunWindow(workspaceRoot, fullRunId);
  const lines = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
  const matched: Array<{
    kind: string;
    summary: string;
    decisionAt?: string;
    tokensIn?: number;
    tokensOut?: number;
    retryCount?: number;
    validationError?: string;
  }> = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as DecisionLogEntry;
      if (!entry.kind || !entry.decisionAt) continue;
      if (window) {
        const ts = new Date(entry.decisionAt).getTime();
        if (!Number.isFinite(ts) || ts < window.startMs || ts > window.endMs) continue;
      }
      const output = entry.output ?? {};
      const rationale = typeof (output as { rationale?: unknown }).rationale === "string"
        ? (output as { rationale: string }).rationale
        : undefined;
      const summary = rationale ?? summarizeJson(output);
      matched.push({
        kind: entry.kind,
        summary,
        decisionAt: entry.decisionAt,
        tokensIn: entry.tokensIn,
        tokensOut: entry.tokensOut,
        retryCount: entry.retryCount,
        validationError: entry.validationError,
      });
    } catch { /* skip malformed line */ }
  }
  return decisionsTemplate({ runId: wantedRunId, decisions: matched });
}

function buildAskBrain(workspaceRoot: string): ArtLabLlmBrain {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const claudeModel = process.env.ARTLAB_CLAUDE_MODEL ?? "claude-opus-4-5";
  const geminiKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("__")
    ? process.env.GEMINI_API_KEY
    : null;
  const geminiBrainModel = process.env.ARTLAB_GEMINI_BRAIN_MODEL;
  const forceGemini = process.env.ARTLAB_BRAIN_PROVIDER === "gemini";
  let raw: ArtLabLlmBrain;
  if (anthropicKey && !forceGemini) {
    const claude = createClaudeBrain({ apiKey: anthropicKey, model: claudeModel });
    const fallback = geminiKey
      ? createGeminiBrain({ apiKey: geminiKey, model: geminiBrainModel })
      : null;
    raw = {
      async decide(req) {
        try { return await claude.decide(req); }
        catch (err) {
          if (!fallback) throw err;
          return fallback.decide(req);
        }
      },
    };
  } else if (geminiKey) {
    raw = createGeminiBrain({ apiKey: geminiKey, model: geminiBrainModel });
  } else {
    raw = { decide: decideWithMockBrain };
  }
  return createLoggedBrain({ inner: raw, workspaceRoot });
}

async function handleAsk(workspaceRoot: string, args: string[]): Promise<TelegramOutboundMessage> {
  const question = args.join(" ").trim();
  if (!question) {
    return { text: "❌ Usage: <code>/ask &lt;question&gt;</code>", parseMode: "HTML" };
  }
  try {
    const bundle = await loadTowerContext({ workspaceRoot });
    const brain = buildAskBrain(workspaceRoot);
    const result = await brain.decide({
      kind: "answer-ask",
      input: {
        question,
        towerContext: {
          styleEnvelope: { id: bundle.styleEnvelope.id, storyTone: bundle.styleEnvelope.storyTone },
          characters: Object.values(bundle.characters).map((c) => ({
            characterId: c.characterId,
            displayName: c.displayName,
            title: c.title,
            space: c.space,
            accent: c.accent,
            visualArchetype: c.visualArchetype,
            silhouette: c.silhouette,
            wardrobe: c.wardrobe,
            wound: c.wound,
            doctrine: c.doctrine,
          })),
          floors: Object.values(bundle.floors).map((f) => ({
            space: f.space,
            roomName: f.roomName,
            floorNumber: f.floorNumber,
            atmosphere: f.atmosphere,
          })),
        },
      },
    });
    const answer = (result.outputJson as { text?: unknown }).text;
    const references = (result.outputJson as { references?: unknown }).references;
    if (typeof answer !== "string" || answer.length === 0) {
      return { text: "🤔 Brain didn't return a clean answer. Try rephrasing?", parseMode: "HTML" };
    }
    return askAnswerTemplate({
      question,
      answer,
      references: Array.isArray(references) ? references.filter((r): r is string => typeof r === "string") : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: `⚠️ Couldn't answer right now — ${msg}`, parseMode: "HTML" };
  }
}

function summarizeJson(json: unknown): string {
  if (!json) return "(no output)";
  if (typeof json === "string") return json.length > 80 ? `${json.slice(0, 80)}…` : json;
  try {
    const text = JSON.stringify(json);
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  } catch {
    return "(unserializable)";
  }
}

export async function handleBotCommand(input: BotCommandInput): Promise<BotCommandResult> {
  const name = input.commandName.toLowerCase();
  if (!(KNOWN as readonly string[]).includes(name)) {
    return { kind: "text", message: unknownCommandTemplate({ commandName: input.commandName }) };
  }
  switch (name as typeof KNOWN[number]) {
    case "status": return { kind: "text", message: await handleStatus(input.workspaceRoot, input.args) };
    case "queue": return { kind: "text", message: handleQueue(input.workspaceRoot) };
    case "cancel": return { kind: "text", message: handleCancel(input.workspaceRoot, input.args, input.chatId) };
    case "health": return { kind: "text", message: await handleHealth(input.workspaceRoot) };
    case "help": return { kind: "text", message: helpTemplate() };
    case "decisions": return { kind: "text", message: handleDecisions(input.workspaceRoot, input.args) };
    case "ask": return { kind: "text", message: await handleAsk(input.workspaceRoot, input.args) };
  }
}
