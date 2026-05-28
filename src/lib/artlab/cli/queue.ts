// src/lib/artlab/cli/queue.ts
//
// `artlab queue` — Tower-styled queue inspection. Lists queued runs with
// priority, asset type, request, and age.
//
// When the queue is empty, the view distinguishes "engine is idle" from
// "no runs queued but N active" by counting runs/<runId>/run-state.json
// files that aren't in the closed phase. Without this distinction, an
// operator inspecting the queue mid-run could conclude the daemon was
// idle when it was in fact actively processing a single run.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { listQueuedRuns } from "@/lib/artlab/queue/queue";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { renderQueueView } from "./ui/render";

export interface QueueSubcommandInput {
  workspaceRoot: string;
  log(line: string): void;
}

export interface QueueSubcommandResult { exitCode: number; }

function countActiveRuns(workspaceRoot: string): number {
  const runsRoot = join(workspaceRoot, "runs");
  if (!existsSync(runsRoot)) return 0;
  let count = 0;
  for (const runId of readdirSync(runsRoot)) {
    try {
      const state = readRunStateSnapshot(join(runsRoot, runId));
      if (state && state.phase !== "closed") count += 1;
    } catch { /* skip unreadable */ }
  }
  return count;
}

export async function runQueueSubcommand(input: QueueSubcommandInput): Promise<QueueSubcommandResult> {
  const queued = (() => { try { return listQueuedRuns(input.workspaceRoot); } catch { return []; } })();
  const activeRunsCount = countActiveRuns(input.workspaceRoot);
  input.log(renderQueueView({ queued, activeRunsCount }));
  return { exitCode: 0 };
}
