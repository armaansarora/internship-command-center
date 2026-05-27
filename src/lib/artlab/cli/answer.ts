// src/lib/artlab/cli/answer.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface AnswerSubcommandInput {
  workspaceRoot: string;
  args: string[];
}

export interface AnswerSubcommandResult {
  exitCode: number;
  message?: string;
}

const ANSWER_USAGE =
  "artlab answer <runId> \"<response>\"  record human response";

export async function runAnswerSubcommand(input: AnswerSubcommandInput): Promise<AnswerSubcommandResult> {
  if (input.args.some((arg) => arg === "--help" || arg === "-h")) {
    return { exitCode: 0, message: ANSWER_USAGE };
  }
  const [runId, ...answerParts] = input.args;
  if (!runId) return { exitCode: 2, message: "answer: expected <runId> \"<answer>\"" };
  const answer = answerParts.join(" ").trim();
  if (answer.length === 0) return { exitCode: 2, message: "answer: expected non-empty answer text" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  if (!existsSync(runDir)) return { exitCode: 1, message: `answer: run ${runId} not found` };
  const inboxDir = join(input.workspaceRoot, "inbox", "cli");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const intentPath = join(inboxDir, `answer-${runId}-${Date.now()}.json`);
  writeFileSync(intentPath, JSON.stringify({
    runId,
    intent: "answer",
    answer,
    requestedAt: new Date().toISOString(),
  }, null, 2));
  return { exitCode: 0, message: `Answer recorded for ${runId}` };
}
