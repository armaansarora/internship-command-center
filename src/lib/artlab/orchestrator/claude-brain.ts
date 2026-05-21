import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ArtLabLlmBrain, ArtLabLlmDecisionRequest, ArtLabLlmDecisionResult } from "./llm-brain";

interface ClaudeBrainOptions {
  apiKey: string;
  model: string;
}

const SYSTEM_PROMPTS: Record<ArtLabLlmDecisionRequest["kind"], string> = {
  "route-ambiguous-brief": "You are the artlab intake brain. Given a brief, return a JSON object with assetType, characterId (if any), confidence (0-1), and reasoning. Never invent characters not on the known list. If a style modifier names one character and the subject is another, return the subject.",
  "clarification-wording": "Phrase a short Telegram clarification message. Plain text. No persona. Offer concrete numbered choices.",
  "concept-qa-adjudication": "Decide regenerate vs supersede vs escalate for failed concept lanes. Return JSON action.",
  "reply-parser-fallback": "Parse an ambiguous human reply against current run state. Return JSON {action, args, askBack}.",
  "prompt-enrichment": "Rewrite the next-run prompt using past wins, rejections, and recent prompt hardening. Return the full prompt string in JSON.",
  "blocker-message-drafting": "Draft a 1-2 sentence Telegram message explaining a blocker with a concrete suggested action. Return JSON {message}.",
};

export interface ArtLabClaudeBrain extends ArtLabLlmBrain {
  modelId: string;
}

export function createClaudeBrain(options: ClaudeBrainOptions): ArtLabClaudeBrain {
  const provider = createAnthropic({ apiKey: options.apiKey });
  return {
    modelId: options.model,
    async decide(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult> {
      if (process.env.ARTLAB_CLAUDE_MODE === "dry-run") {
        return {
          kind: req.kind,
          outputJson: { dryRun: true, echoedInput: req.input },
          confidence: 0,
          tokensIn: 0,
          tokensOut: 0,
          model: options.model,
        };
      }
      const system = SYSTEM_PROMPTS[req.kind];
      const { text, usage } = await generateText({
        model: provider(options.model),
        messages: [
          {
            role: "system",
            content: system,
            providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
          },
          { role: "user", content: JSON.stringify(req.input) },
        ],
      });
      let outputJson: Record<string, unknown> = {};
      try {
        outputJson = JSON.parse(text);
      } catch {
        outputJson = { rawText: text };
      }
      return {
        kind: req.kind,
        outputJson,
        confidence: typeof outputJson.confidence === "number" ? outputJson.confidence : 0.5,
        tokensIn: usage.inputTokens ?? 0,
        tokensOut: usage.outputTokens ?? 0,
        model: options.model,
      };
    },
  };
}
