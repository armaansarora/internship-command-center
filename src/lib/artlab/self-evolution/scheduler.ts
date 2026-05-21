// src/lib/artlab/self-evolution/scheduler.ts
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { detectFriction } from "./friction-detector";
import { summonCodex } from "./codex-summoner";

const COOLDOWN_MS = 60 * 60_000;

export interface SelfEvolutionInput {
  workspaceRoot: string;
  today: string;
  now: () => Date;
}

export interface SelfEvolutionResult {
  skipped?: "cooldown";
  summonedBranches: string[];
}

function lastRunPath(workspaceRoot: string): string {
  return join(workspaceRoot, "self-evolution-last-run.json");
}

function readLastRunAt(workspaceRoot: string): Date | null {
  const path = lastRunPath(workspaceRoot);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { at?: string };
    return parsed.at ? new Date(parsed.at) : null;
  } catch { return null; }
}

function writeLastRun(workspaceRoot: string, at: Date): void {
  const path = lastRunPath(workspaceRoot);
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify({ at: at.toISOString() }, null, 2) + "\n");
  renameSync(tmp, path);
}

export async function runSelfEvolutionScheduler(input: SelfEvolutionInput): Promise<SelfEvolutionResult> {
  const now = input.now();
  const lastRunAt = readLastRunAt(input.workspaceRoot);
  if (lastRunAt && now.getTime() - lastRunAt.getTime() < COOLDOWN_MS) {
    return { skipped: "cooldown", summonedBranches: [] };
  }
  const friction = await detectFriction({ workspaceRoot: input.workspaceRoot });
  const summonedBranches: string[] = [];
  for (const group of friction.actionable) {
    const result = await summonCodex({ group, cwd: input.workspaceRoot, today: input.today });
    summonedBranches.push(result.branchName);
  }
  writeLastRun(input.workspaceRoot, now);
  return { summonedBranches };
}
