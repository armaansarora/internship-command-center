import { z } from "zod";

export const ARTLAB_LLM_DECISION_KINDS = [
  // Phase-3 originals (already in spec)
  "route-ambiguous-brief",
  "clarification-wording",
  "concept-qa-adjudication",
  "reply-parser-fallback",
  "prompt-enrichment",
  "blocker-message-drafting",
  // Tranche-1+ additions for Tower-context-aware generation
  "generate-concept-prompts",
  "generate-environment-prompts",
  "generate-ui-prompts",
  "generate-animation-prompts",
  "recommend-direction",
  "revise-concept-board",
  "compose-trigger-clarification",
] as const;
export type ArtLabLlmDecisionKind = (typeof ARTLAB_LLM_DECISION_KINDS)[number];

export const ArtLabLlmDecisionRequestSchema = z
  .object({
    kind: z.enum(ARTLAB_LLM_DECISION_KINDS),
    input: z.record(z.string(), z.unknown()),
  })
  .strict();
export type ArtLabLlmDecisionRequest = z.infer<typeof ArtLabLlmDecisionRequestSchema>;

export interface ArtLabLlmDecisionResult {
  kind: ArtLabLlmDecisionKind;
  outputJson: Record<string, unknown>;
  confidence: number;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface ArtLabLlmBrain {
  decide(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult>;
}

export async function decideWithMockBrain(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult> {
  ArtLabLlmDecisionRequestSchema.parse(req);
  return {
    kind: req.kind,
    outputJson: { mock: true, echoedInput: req.input },
    confidence: 0.9,
    tokensIn: 100,
    tokensOut: 20,
    model: "mock-llm",
  };
}
