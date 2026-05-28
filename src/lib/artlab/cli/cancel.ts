// src/lib/artlab/cli/cancel.ts
//
// `artlab cancel <runId>` — writes a cancel intent file into the daemon
// inbox. The daemon's cancel-flow (`src/lib/artlab/daemon/cancel-flow.ts`)
// drains files matching `cancel-*.json` from `<workspaceRoot>/inbox/` on
// every tick, resolves the run's PID via the supervisor, and sends SIGTERM.
//
// The intent file shape is exactly `{ runId, requestedAt }`. The daemon
// only reads `runId`; `requestedAt` is included for telemetry/audit.
//
// Writes are atomic (temp + rename), matching the pattern used in
// `state/snapshots.ts`, so a half-written file is never observable by the
// daemon's directory scan.

import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface CancelSubcommandInput {
  workspaceRoot: string;
  args: string[];
}

export interface CancelSubcommandResult {
  exitCode: number;
  message?: string;
}

const CANCEL_USAGE = "usage: artlab cancel <runId>";

function atomicWriteJson(targetPath: string, content: string): void {
  const dir = dirname(targetPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, content, { encoding: "utf8" });
  renameSync(tmp, targetPath);
}

export async function runCancelSubcommand(
  input: CancelSubcommandInput,
): Promise<CancelSubcommandResult> {
  if (input.args.some((arg) => arg === "--help" || arg === "-h")) {
    return { exitCode: 0, message: CANCEL_USAGE };
  }
  const runId = input.args[0];
  if (!runId) return { exitCode: 2, message: CANCEL_USAGE };
  const runStatePath = join(input.workspaceRoot, "runs", runId, "run-state.json");
  if (!existsSync(runStatePath)) {
    return { exitCode: 1, message: `cancel: no such run ${runId}` };
  }
  const intentPath = join(input.workspaceRoot, "inbox", `cancel-${runId}.json`);
  const body = {
    runId,
    requestedAt: new Date().toISOString(),
  };
  atomicWriteJson(intentPath, `${JSON.stringify(body, null, 2)}\n`);
  return {
    exitCode: 0,
    message: "cancel intent written; daemon will SIGTERM within next tick",
  };
}
