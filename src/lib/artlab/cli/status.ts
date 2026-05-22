// src/lib/artlab/cli/status.ts
//
// `artlab status` — Tower-styled engine status view. Builds the active-runs
// list from runs/<runId>/run-state.json, the queue from listQueuedRuns,
// and the recent-errors list from daemon-errors.jsonl.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { listQueuedRuns } from "@/lib/artlab/queue/queue";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import type { ArtLabRunState } from "@/lib/artlab/types";
import { renderStatusView } from "./ui/render";

export interface StatusSubcommandInput {
  workspaceRoot: string;
  log(line: string): void;
}

export interface StatusSubcommandResult { exitCode: number; }

function readActiveRuns(workspaceRoot: string): ArtLabRunState[] {
  const runsRoot = join(workspaceRoot, "runs");
  if (!existsSync(runsRoot)) return [];
  const out: ArtLabRunState[] = [];
  for (const runId of readdirSync(runsRoot)) {
    const runDir = join(runsRoot, runId);
    try {
      const state = readRunStateSnapshot(runDir);
      if (state && state.phase !== "closed") out.push(state);
    } catch { /* skip unreadable runs */ }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function readRecentErrors(workspaceRoot: string): Array<{ at: string; source: string; message: string }> {
  const path = join(workspaceRoot, "daemon-errors.jsonl");
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  const tail = lines.slice(-20);
  const out: Array<{ at: string; source: string; message: string }> = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line) as { at?: string; source?: string; message?: string };
      out.push({
        at: parsed.at ?? new Date().toISOString(),
        source: parsed.source ?? "unknown",
        message: parsed.message ?? "",
      });
    } catch { /* skip malformed */ }
  }
  return out;
}

export async function runStatusSubcommand(input: StatusSubcommandInput): Promise<StatusSubcommandResult> {
  const queued = (() => { try { return listQueuedRuns(input.workspaceRoot); } catch { return []; } })();
  const activeRuns = readActiveRuns(input.workspaceRoot);
  const recentErrors = readRecentErrors(input.workspaceRoot);
  input.log(renderStatusView({
    workspaceRoot: input.workspaceRoot,
    queued,
    activeRuns,
    recentErrors,
  }));
  return { exitCode: 0 };
}
