import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readRunReality } from "../state/reconciler";
import { listQueuedRuns } from "../queue/queue";
import { buildArtLabHealthSnapshot } from "../health/snapshot";
import {
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
}

export interface BotCommandResult {
  kind: "text";
  message: TelegramOutboundMessage;
}

const KNOWN = ["status", "queue", "cancel", "health", "help", "decisions"] as const;

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
  });
}

function handleQueue(workspaceRoot: string): TelegramOutboundMessage {
  const queued = listQueuedRuns(workspaceRoot);
  return queueList({ entries: queued });
}

function handleCancel(workspaceRoot: string, args: string[]): TelegramOutboundMessage {
  if (args.length === 0) {
    return { text: "❌ Usage: <code>/cancel &lt;runId&gt;</code>", parseMode: "HTML" };
  }
  const runId = args[0]!;
  const inboxDir = join(workspaceRoot, "inbox");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const path = join(inboxDir, `cancel-${runId}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ runId, requestedAt: new Date().toISOString() }));
  return cancelAck({ runId });
}

async function handleHealth(workspaceRoot: string): Promise<TelegramOutboundMessage> {
  const snapshot = await buildArtLabHealthSnapshot(workspaceRoot);
  return healthSnapshot({
    activeLocks: snapshot.locks.locks.length,
    activeRuns: snapshot.processes.activeProcessCount,
    activeLeases: snapshot.leases.length,
    monthlySpendCents: snapshot.spend.totalSpentCents,
    collectedAt: snapshot.collectedAt,
  });
}

interface DecisionLogEntry {
  runId?: string;
  decision?: { kind?: string; outputJson?: unknown; rationale?: string };
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
  const lines = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
  const matched: Array<{ kind: string; summary: string }> = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as DecisionLogEntry;
      if (!entry.runId || !entry.runId.startsWith(wantedRunId.slice(0, 8))) continue;
      const kind = entry.decision?.kind ?? "unknown";
      const rationale = entry.decision?.rationale;
      const summary = rationale ?? summarizeJson(entry.decision?.outputJson);
      matched.push({ kind, summary });
    } catch { /* skip malformed line */ }
  }
  return decisionsTemplate({ runId: wantedRunId, decisions: matched });
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
    case "cancel": return { kind: "text", message: handleCancel(input.workspaceRoot, input.args) };
    case "health": return { kind: "text", message: await handleHealth(input.workspaceRoot) };
    case "help": return { kind: "text", message: helpTemplate() };
    case "decisions": return { kind: "text", message: handleDecisions(input.workspaceRoot, input.args) };
  }
}
