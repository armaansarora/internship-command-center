// src/lib/artlab/migration/baseline-recorder.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface BaselineEntry {
  label: string;
  runId: string;
  wallClockMs: number;
  startedAt: string;
  endedAt: string;
  recordedAt: string;
}

export async function recordBaseline(input: { workspaceRoot: string; runId: string; label: string }): Promise<BaselineEntry> {
  const eventsPath = join(input.workspaceRoot, "runs", input.runId, "events.jsonl");
  if (!existsSync(eventsPath)) throw new Error(`events.jsonl not found for runId=${input.runId}`);
  const lines = readFileSync(eventsPath, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { at: string });
  if (lines.length < 2) throw new Error(`events.jsonl has fewer than 2 entries`);
  const startedAt = lines[0]!.at;
  const endedAt = lines[lines.length - 1]!.at;
  const wallClockMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const entry: BaselineEntry = {
    label: input.label,
    runId: input.runId,
    wallClockMs,
    startedAt,
    endedAt,
    recordedAt: new Date().toISOString(),
  };
  const ledgersDir = join(input.workspaceRoot, "ledgers");
  if (!existsSync(ledgersDir)) mkdirSync(ledgersDir, { recursive: true });
  appendFileSync(join(ledgersDir, "baselines.jsonl"), JSON.stringify(entry) + "\n");
  return entry;
}

export async function readBaseline(input: { workspaceRoot: string; label: string }): Promise<BaselineEntry | null> {
  const path = join(input.workspaceRoot, "ledgers", "baselines.jsonl");
  if (!existsSync(path)) return null;
  const entries = readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l) as BaselineEntry);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]!.label === input.label) return entries[i]!;
  }
  return null;
}
