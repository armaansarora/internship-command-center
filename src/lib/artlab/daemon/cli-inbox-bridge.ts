// src/lib/artlab/daemon/cli-inbox-bridge.ts
//
// Reads CLI-written intents from inbox/cli/ and routes them into the engine.
// produce-*.json → new run on the queue (drainInbox + enqueueRun).
// continue-*.json / answer-*.json → recorded inside runs/<runId>/cli-inbox/
// so the running engine process for that run picks them up on its next tick.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { enqueueRun } from "@/lib/artlab/queue/queue";
import { drainInbox } from "./inbox-watcher";

export interface CliInboxBridgeInput {
  workspaceRoot: string;
  now?: () => Date;
}

export interface CliInboxBridgeResult {
  enqueuedRunIds: string[];
  continueIntents: number;
  answerIntents: number;
}

export interface CliInboxBridge {
  drain(): Promise<CliInboxBridgeResult>;
}

function recordIntoRun(
  workspaceRoot: string,
  runId: string,
  kind: "continue" | "answer",
  payload: Record<string, unknown>,
): void {
  const runDir = join(workspaceRoot, "runs", runId);
  if (!existsSync(runDir)) return;
  const dir = join(runDir, "cli-inbox");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  writeFileSync(path, JSON.stringify({ kind, ...payload }, null, 2));
}

export function createCliInboxBridge(input: CliInboxBridgeInput): CliInboxBridge {
  const now = input.now ?? (() => new Date());
  return {
    async drain(): Promise<CliInboxBridgeResult> {
      const enqueuedRunIds: string[] = [];
      let continueIntents = 0;
      let answerIntents = 0;

      const produces = await drainInbox({ workspaceRoot: input.workspaceRoot, subdir: "cli", prefix: "produce-" });
      for (const intent of produces.intents) {
        const request = String(intent.body.request ?? "").trim();
        if (!request) continue;
        const runId = randomUUID();
        enqueueRun(input.workspaceRoot, {
          runId,
          priority: "default",
          enqueuedAt: now().toISOString(),
          spec: { sourceSurface: "cli", intent: "produce", request },
        });
        enqueuedRunIds.push(runId);
      }

      const continues = await drainInbox({ workspaceRoot: input.workspaceRoot, subdir: "cli", prefix: "continue-" });
      for (const intent of continues.intents) {
        const runId = String(intent.body.runId ?? "");
        if (!runId) continue;
        recordIntoRun(input.workspaceRoot, runId, "continue", { requestedAt: now().toISOString() });
        continueIntents += 1;
      }

      const answers = await drainInbox({ workspaceRoot: input.workspaceRoot, subdir: "cli", prefix: "answer-" });
      for (const intent of answers.intents) {
        const runId = String(intent.body.runId ?? "");
        const answer = String(intent.body.answer ?? "");
        if (!runId || !answer) continue;
        recordIntoRun(input.workspaceRoot, runId, "answer", { answer, requestedAt: now().toISOString() });
        answerIntents += 1;
      }

      return { enqueuedRunIds, continueIntents, answerIntents };
    },
  };
}
