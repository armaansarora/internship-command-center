// src/lib/artlab/cli/continue.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ContinueSubcommandInput {
  workspaceRoot: string;
  args: string[];
}

export interface ContinueSubcommandResult {
  exitCode: number;
  message?: string;
}

export async function runContinueSubcommand(input: ContinueSubcommandInput): Promise<ContinueSubcommandResult> {
  const runId = input.args[0];
  if (!runId) return { exitCode: 2, message: "continue: expected <runId>" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  if (!existsSync(runDir)) return { exitCode: 1, message: `continue: run ${runId} not found` };
  const inboxDir = join(input.workspaceRoot, "inbox", "cli");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const intentPath = join(inboxDir, `continue-${runId}-${Date.now()}.json`);
  writeFileSync(intentPath, JSON.stringify({
    runId,
    intent: "continue",
    requestedAt: new Date().toISOString(),
  }, null, 2));
  return { exitCode: 0, message: `Continue intent recorded for ${runId}` };
}
