// src/lib/artlab/cli/status.ts
//
// `artlab status [runId]` — Tower-styled engine status view.
//   - No args:   global view (active runs + queue + recent errors)
//   - <runId>:   single-run detail view (phase, blocker, events, etc.)
//
// The runId path validates the UUID shape and rejects malformed inputs with
// exit 2 (operator error) rather than throwing a stack trace.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { listQueuedRuns } from "@/lib/artlab/queue/queue";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { readArtLabEvents } from "@/lib/artlab/state/events";
import type { ArtLabRunState } from "@/lib/artlab/types";
import { renderStatusView, renderRunDetailView } from "./ui/render";

export interface StatusSubcommandInput {
  workspaceRoot: string;
  args?: string[];
  log(line: string): void;
}

export interface StatusSubcommandResult { exitCode: number; }

const STATUS_USAGE = "artlab status [runId]               plain-English status (no runId = global view)";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const args = input.args ?? [];
  if (args.some((arg) => arg === "--help" || arg === "-h")) {
    input.log(STATUS_USAGE);
    return { exitCode: 0 };
  }

  const maybeRunId = args.find((arg) => !arg.startsWith("-"));
  if (maybeRunId) {
    // Validate UUID shape before touching the filesystem; a malformed runId
    // is operator error (exit 2), distinct from "valid id, not found" (exit 1).
    if (!UUID_REGEX.test(maybeRunId)) {
      input.log(`status: invalid runId "${maybeRunId}" — expected a UUID`);
      return { exitCode: 2 };
    }
    const runDir = join(input.workspaceRoot, "runs", maybeRunId);
    const state = (() => {
      try { return readRunStateSnapshot(runDir); } catch { return null; }
    })();
    if (!state) {
      input.log(`status: run ${maybeRunId} not found`);
      return { exitCode: 1 };
    }
    const events = (() => {
      try { return readArtLabEvents(runDir); } catch { return []; }
    })();
    input.log(renderRunDetailView({
      workspaceRoot: input.workspaceRoot,
      state,
      events,
    }));
    return { exitCode: 0 };
  }

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
