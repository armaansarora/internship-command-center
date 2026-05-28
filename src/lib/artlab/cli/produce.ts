// src/lib/artlab/cli/produce.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface ProduceSubcommandInput {
  workspaceRoot: string;
  args: string[];
}

export interface ProduceSubcommandResult {
  exitCode: number;
  runId?: string;
  message?: string;
}

const PRODUCE_USAGE =
  "artlab produce <request>            new run; LLM brain routes";

export async function runProduceSubcommand(input: ProduceSubcommandInput): Promise<ProduceSubcommandResult> {
  if (input.args.some((arg) => arg === "--help" || arg === "-h")) {
    return { exitCode: 0, message: PRODUCE_USAGE };
  }
  const request = input.args.join(" ").trim();
  if (request.length === 0) {
    return { exitCode: 2, message: "produce: expected <request> as positional args" };
  }
  const runId = randomUUID();
  const inboxDir = join(input.workspaceRoot, "inbox", "cli");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const intentPath = join(inboxDir, `produce-${runId}.json`);
  // Include runId so the daemon's cli-inbox-bridge enqueues with the SAME id
  // we just returned to the operator — otherwise `artlab status <runId>` and
  // `artlab cancel <runId>` would target a phantom.
  writeFileSync(intentPath, JSON.stringify({
    runId,
    request,
    sourceSurface: "cli",
    createdAt: new Date().toISOString(),
  }, null, 2));
  return { exitCode: 0, runId, message: `Queued run ${runId}` };
}
