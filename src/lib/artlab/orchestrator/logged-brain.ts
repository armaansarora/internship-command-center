// src/lib/artlab/orchestrator/logged-brain.ts
//
// Decorator that wraps any ArtLabLlmBrain and appends every decision to the
// memory/decision-log.jsonl ledger. Use this in production wiring instead of
// the raw brain so decision history is captured automatically. Logging errors
// must never break the underlying decision call.

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { appendLlmDecision } from "./decision-log";
import type { ArtLabLlmBrain, ArtLabLlmDecisionRequest, ArtLabLlmDecisionResult } from "./llm-brain";

export interface LoggedBrainInput {
  inner: ArtLabLlmBrain;
  workspaceRoot: string;
  buildPrompt?: (req: ArtLabLlmDecisionRequest) => string;
  now?: () => Date;
}

export function createLoggedBrain(input: LoggedBrainInput): ArtLabLlmBrain {
  const buildPrompt = input.buildPrompt ?? ((req) => `kind=${req.kind} input=${JSON.stringify(req.input)}`);
  const now = input.now ?? (() => new Date());
  return {
    async decide(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult> {
      const result = await input.inner.decide(req);
      try {
        const memoryDir = join(input.workspaceRoot, "memory");
        if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
        appendLlmDecision(memoryDir, {
          decisionAt: now().toISOString(),
          kind: req.kind,
          input: req.input,
          prompt: buildPrompt(req),
          output: result.outputJson,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          model: result.model,
          confidence: result.confidence,
        });
      } catch { /* never let decision logging break the call */ }
      return result;
    },
  };
}
