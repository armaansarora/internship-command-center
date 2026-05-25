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
  // Brainstorm-mode (Tranche A-D) additions — LLM as the conversational host
  "compose-brief",
  "refine-brief",
  "critique-concept-board",
  "refine-concept-prompts",
  "critique-production-sprites",
  "compose-trigger-ack",
  "compose-promotion-celebration",
  "answer-ask",
] as const;
export type ArtLabLlmDecisionKind = (typeof ARTLAB_LLM_DECISION_KINDS)[number];

// Vision-aware brain calls pass image bytes alongside the JSON input. The
// brain adapter (gemini-brain / claude-brain) encodes these as inlineData
// parts in the request. Path-based references avoid copying large PNG
// buffers between processes.
const ImageInputSchema = z.union([
  z.object({ path: z.string().min(1), mimeType: z.string().optional() }).strict(),
  z.object({ bytes: z.instanceof(Buffer), mimeType: z.string().min(1) }).strict(),
]);
export type ArtLabLlmImageInput = z.infer<typeof ImageInputSchema>;

export const ArtLabLlmDecisionRequestSchema = z
  .object({
    kind: z.enum(ARTLAB_LLM_DECISION_KINDS),
    input: z.record(z.string(), z.unknown()),
    images: z.array(ImageInputSchema).optional(),
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
  // Reliability metadata — optional so existing callers + mock brain don't
  // need to set them. logged-brain reads these and writes them into the
  // decision log entry so /decisions can surface transient flakiness.
  retryCount?: number;
  lastTransientError?: string;
  validationError?: string;
  durationMs?: number;
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
