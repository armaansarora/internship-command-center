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

function shortId(runId: string): string { return runId.slice(0, 8); }

async function handleStatus(workspaceRoot: string, args: string[]): Promise<string> {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return "📭 No active runs.";
  const runs = readdirSync(runsDir).filter((f) => !f.startsWith("."));
  if (runs.length === 0) return "📭 No active runs.";
  if (args.length === 0) {
    return [
      `📊 Active runs (${runs.length})`,
      ``,
      ...runs.map((r) => `  • ${shortId(r)}`),
    ].join("\n");
  }
  const runId = args[0]!;
  const reality = await readRunReality(join(runsDir, runId));
  if (!reality) return `🤷 No run found for ${shortId(runId)}.`;
  return [
    `📊 Run ${shortId(runId)}`,
    ``,
    `Phase: ${reality.phase}${reality.blocker ? ` ⚠️ blocked: ${reality.blocker}` : ""}`,
    `Slots: ${reality.slots.completed} done · ${reality.slots.running} running · ${reality.slots.failed} failed`,
    `Spend: $${(reality.spend.actualCents / 100).toFixed(2)} / $${(reality.spend.monthlyCeilingCents / 100).toFixed(2)} monthly`,
  ].join("\n");
}

function handleQueue(workspaceRoot: string): string {
  const queued = listQueuedRuns(workspaceRoot);
  if (queued.length === 0) return "📭 Queue empty.";
  return [
    `📋 Queue (${queued.length})`,
    ``,
    ...queued.map((q) => `  • ${shortId(q.runId)} (${q.priority})`),
  ].join("\n");
}

function handleCancel(workspaceRoot: string, args: string[]): string {
  if (args.length === 0) return "❌ Usage: /cancel <runId>";
  const runId = args[0]!;
  const inboxDir = join(workspaceRoot, "inbox");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const path = join(inboxDir, `cancel-${runId}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ runId, requestedAt: new Date().toISOString() }));
  return `🛑 Cancel intent recorded for ${shortId(runId)}.\nDaemon will send SIGTERM on the next sweep.`;
}

async function handleHealth(workspaceRoot: string): Promise<string> {
  const snapshot = await buildArtLabHealthSnapshot(workspaceRoot);
  return [
    `💚 Engine health`,
    ``,
    `Active locks: ${snapshot.locks.locks.length}`,
    `Active runs: ${snapshot.processes.activeProcessCount}`,
    `Active leases: ${snapshot.leases.length}`,
    `Monthly spend: $${(snapshot.spend.totalSpentCents / 100).toFixed(2)}`,
    ``,
    `Snapshot: ${snapshot.collectedAt}`,
  ].join("\n");
}

function helpText(): string {
  return [
    `🎨 ArtLab — Tower creative engine`,
    ``,
    `Triggers:`,
    `  make <character>          — start a new run`,
    `  make <character> + photo  — start with a reference image`,
    ``,
    `Gates:`,
    `  approve direction 1-5     — pick a concept lane`,
    `  approved for app          — promote final board to public/art`,
    `  revise: <change>          — request a revision`,
    `  reject                    — abandon the run`,
    ``,
    `Commands:`,
    `  /status [runId]           — engine status`,
    `  /queue                    — queued + active runs`,
    `  /cancel <runId>           — cancel a run`,
    `  /health                   — engine health snapshot`,
    `  /help                     — this message`,
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
    case "health": return { kind: "text", text: await handleHealth(input.workspaceRoot) };
    case "help": return { kind: "text", text: helpText() };
  }
}
