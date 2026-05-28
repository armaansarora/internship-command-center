// src/lib/artlab/daemon/cli-inbox-consumer.ts
//
// Drains per-run cli-inbox/ directories that the cli-inbox-bridge populates.
// answer-*.json with text "approve direction N" advances a brief-review run
// to generating-concepts via the same approveBrief helper the Telegram path
// uses. Consumed files are deleted. Matches Telegram's source semantics in
// the emitted phase-transition event (source: "cli-inbox-consumer").

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { parseReplyExact, parseReplyPattern } from "@/lib/artlab/bot/reply-parser";
import { approveBrief } from "@/lib/artlab/bot/brief-advance";
import { advanceConceptApproval, advancePromotionApproval } from "@/lib/artlab/bot/gate-advance";

export interface CliInboxConsumerInput {
  workspaceRoot: string;
}

export interface CliInboxAdvancement {
  runId: string;
  from: string;
  to: string;
}

export interface CliInboxConsumerResult {
  answersProcessed: number;
  advancements: CliInboxAdvancement[];
}

export interface CliInboxConsumer {
  drain(): Promise<CliInboxConsumerResult>;
}

export function createCliInboxConsumer(input: CliInboxConsumerInput): CliInboxConsumer {
  return {
    async drain(): Promise<CliInboxConsumerResult> {
      const result: CliInboxConsumerResult = { answersProcessed: 0, advancements: [] };
      const runsDir = join(input.workspaceRoot, "runs");
      if (!existsSync(runsDir)) return result;

      for (const runId of readdirSync(runsDir)) {
        if (runId.startsWith(".")) continue;
        const runDir = join(runsDir, runId);
        const cliInbox = join(runDir, "cli-inbox");
        if (!existsSync(cliInbox)) continue;

        for (const file of readdirSync(cliInbox)) {
          if (!file.startsWith("answer-") || !file.endsWith(".json")) continue;
          const path = join(cliInbox, file);
          const body = JSON.parse(readFileSync(path, "utf8")) as { answer?: string };
          const answerText = String(body.answer ?? "").trim();
          result.answersProcessed += 1;

          const state = readRunStateSnapshot(runDir);
          if (!state) { rmSync(path); continue; }

          const exact = parseReplyExact(answerText);
          const pattern = parseReplyPattern(answerText);

          if (state.phase === "brief-review" && pattern.kind === "matched" && pattern.action.type === "approve-direction") {
            const r = await approveBrief({ workspaceRoot: input.workspaceRoot, runId });
            if (r.ok) result.advancements.push({ runId, from: "brief-review", to: "generating-concepts" });
          } else if (state.phase === "concept-review" && pattern.kind === "matched" && pattern.action.type === "approve-direction") {
            const r = await advanceConceptApproval({ workspaceRoot: input.workspaceRoot, laneIndex: pattern.action.laneIndex });
            if (r.ok) result.advancements.push({ runId, from: "concept-review", to: "canary" });
          } else if (state.phase === "final-review" && exact.kind === "promotion-accepted") {
            const r = await advancePromotionApproval({ workspaceRoot: input.workspaceRoot });
            if (r.ok) result.advancements.push({ runId, from: "final-review", to: "promoting" });
          }
          rmSync(path);
        }
      }
      return result;
    },
  };
}
