import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readRunReality } from "../state/reconciler";
import { listQueuedRuns } from "../queue/queue";
import { buildArtLabHealthSnapshot } from "../health/snapshot";

export interface BotCommandInput {
  workspaceRoot: string;
  commandName: string;
  args: string[];
}

export interface BotCommandResult { kind: "text"; text: string; }

const KNOWN = ["status", "queue", "cancel", "health", "help"] as const;

async function handleStatus(workspaceRoot: string, args: string[]): Promise<string> {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return "No active runs.";
  const runs = readdirSync(runsDir).filter((f) => !f.startsWith("."));
  if (runs.length === 0) return "No active runs.";
  if (args.length === 0) return `Active runs:\n${runs.map((r) => `  ${r}`).join("\n")}`;
  const runId = args[0]!;
  const reality = await readRunReality(join(runsDir, runId));
  if (!reality) return `No run found for ${runId}`;
  return [
    `Run ${runId}: ${reality.phase}${reality.blocker ? ` (blocked: ${reality.blocker})` : ""}`,
    `Slots — completed: ${reality.slots.completed}, running: ${reality.slots.running}, failed: ${reality.slots.failed}`,
    `Spend — $${(reality.spend.actualCents / 100).toFixed(2)} of $${(reality.spend.monthlyCeilingCents / 100).toFixed(2)} monthly`,
  ].join("\n");
}

function handleQueue(workspaceRoot: string): string {
  const queued = listQueuedRuns(workspaceRoot);
  if (queued.length === 0) return "Queue empty — 0 queued runs.";
  return `${queued.length} queued runs:\n${queued.map((q) => `  ${q.runId} (${q.priority})`).join("\n")}`;
}

function handleCancel(workspaceRoot: string, args: string[]): string {
  if (args.length === 0) return "cancel: expected <runId>";
  const runId = args[0]!;
  const inboxDir = join(workspaceRoot, "inbox");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const path = join(inboxDir, `cancel-${runId}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ runId, requestedAt: new Date().toISOString() }));
  return `Cancel intent recorded for ${runId}. Daemon will send SIGTERM next sweep.`;
}

function handleHealth(workspaceRoot: string): string {
  const snapshot = buildArtLabHealthSnapshot(workspaceRoot);
  return [
    `Health @ ${snapshot.collectedAt}`,
    `Active locks: ${snapshot.locks.locks.length}`,
    `Active runs: ${snapshot.processes.activeProcessCount}`,
    `Active leases: ${snapshot.leases.length}`,
    `Monthly spend: $${(snapshot.spend.totalSpentCents / 100).toFixed(2)}`,
  ].join("\n");
}

function helpText(): string {
  return [
    "Known commands:",
    "  /status [runId] — engine status (plain English)",
    "  /queue — queued + active runs",
    "  /cancel <runId> — cancel a run",
    "  /health — engine health report",
  ].join("\n");
}

export async function handleBotCommand(input: BotCommandInput): Promise<BotCommandResult> {
  const name = input.commandName.toLowerCase();
  if (!(KNOWN as readonly string[]).includes(name)) {
    return { kind: "text", text: `Unknown command /${input.commandName}.\n\n${helpText()}` };
  }
  switch (name as typeof KNOWN[number]) {
    case "status": return { kind: "text", text: await handleStatus(input.workspaceRoot, input.args) };
    case "queue": return { kind: "text", text: handleQueue(input.workspaceRoot) };
    case "cancel": return { kind: "text", text: handleCancel(input.workspaceRoot, input.args) };
    case "health": return { kind: "text", text: handleHealth(input.workspaceRoot) };
    case "help": return { kind: "text", text: helpText() };
  }
}
