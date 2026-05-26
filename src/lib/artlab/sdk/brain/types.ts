import { z } from "zod";

export const FOUNDRY_AGENT_KINDS = [
  "character-master",
  "floor-environment",
  "ui-texture",
  "sprite-animator",
] as const;
export type FoundryAgentKind = (typeof FOUNDRY_AGENT_KINDS)[number];

/** Output shape of the meta-orchestrator's intent resolver. */
export const FoundryMetaIntentSchema = z
  .object({
    agent: z.enum(FOUNDRY_AGENT_KINDS),
    parsedArgs: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1).optional(),
  })
  .strict();
export type FoundryMetaIntent = z.infer<typeof FoundryMetaIntentSchema>;

export const FoundryClarifyingQuestionSchema = z
  .object({
    needsClarification: z.literal(true),
    question: z.string().min(8),
    candidates: z.array(z.enum(FOUNDRY_AGENT_KINDS)).min(1),
    confidence: z.number().min(0).max(1),
  })
  .strict();
export type FoundryClarifyingQuestion = z.infer<typeof FoundryClarifyingQuestionSchema>;

/** Result of one specialist brain invocation. */
export const FoundryAgentBrainResultSchema = z
  .object({
    agent: z.enum(FOUNDRY_AGENT_KINDS),
    output: z.record(z.string(), z.unknown()),
    tokensIn: z.number().int().min(0),
    tokensOut: z.number().int().min(0),
    model: z.string().min(1),
    durationMs: z.number().int().min(0),
    cacheHit: z.boolean().optional(),
  })
  .strict();
export type FoundryAgentBrainResult = z.infer<typeof FoundryAgentBrainResultSchema>;

/** Generic shape every per-agent brain conforms to. */
export interface FoundryAgentBrain<Input, Output> {
  agent: FoundryAgentKind;
  systemPrompt: string;
  inputSchema: z.ZodType<Input>;
  outputSchema: z.ZodType<Output>;
  decide(input: Input): Promise<FoundryAgentBrainResult & { output: Output }>;
}
