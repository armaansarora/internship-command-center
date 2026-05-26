import { z } from "zod";

export const ARTLAB_AGENT_KINDS = [
  "character-master",
  "floor-environment",
  "ui-texture",
  "sprite-animator",
] as const;
export type ArtLabAgentKind = (typeof ARTLAB_AGENT_KINDS)[number];

/** Output shape of the meta-orchestrator's intent resolver. */
export const ArtLabMetaIntentSchema = z
  .object({
    agent: z.enum(ARTLAB_AGENT_KINDS),
    parsedArgs: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1).optional(),
  })
  .strict();
export type ArtLabMetaIntent = z.infer<typeof ArtLabMetaIntentSchema>;

export const ArtLabClarifyingQuestionSchema = z
  .object({
    needsClarification: z.literal(true),
    question: z.string().min(8),
    candidates: z.array(z.enum(ARTLAB_AGENT_KINDS)).min(1),
    confidence: z.number().min(0).max(1),
  })
  .strict();
export type ArtLabClarifyingQuestion = z.infer<typeof ArtLabClarifyingQuestionSchema>;

/** Result of one specialist brain invocation. */
export const ArtLabAgentBrainResultSchema = z
  .object({
    agent: z.enum(ARTLAB_AGENT_KINDS),
    output: z.record(z.string(), z.unknown()),
    tokensIn: z.number().int().min(0),
    tokensOut: z.number().int().min(0),
    model: z.string().min(1),
    durationMs: z.number().int().min(0),
    cacheHit: z.boolean().optional(),
  })
  .strict();
export type ArtLabAgentBrainResult = z.infer<typeof ArtLabAgentBrainResultSchema>;

/** Generic shape every per-agent brain conforms to. */
export interface ArtLabAgentBrain<Input, Output> {
  agent: ArtLabAgentKind;
  systemPrompt: string;
  inputSchema: z.ZodType<Input>;
  outputSchema: z.ZodType<Output>;
  decide(input: Input): Promise<ArtLabAgentBrainResult & { output: Output }>;
}
