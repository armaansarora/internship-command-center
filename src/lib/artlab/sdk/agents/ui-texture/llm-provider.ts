// src/lib/foundry/agents/ui-texture/llm-provider.ts
import { z } from "zod";

export const FoundryIconLlmInputSchema = z
  .object({
    name: z.string().min(1),
    ariaLabel: z.string().min(1),
    strokeWidthPx: z.number().positive(),
    viewBox: z.string().regex(/^-?\d+ -?\d+ \d+ \d+$/),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type FoundryIconLlmInput = z.infer<typeof FoundryIconLlmInputSchema>;

export const FoundryIconLlmResultSchema = z
  .object({
    svg: z.string().min(1),
    mode: z.enum(["real", "mock"]),
    costCents: z.number().int().min(0),
    durationMs: z.number().int().min(0),
  })
  .strict();
export type FoundryIconLlmResult = z.infer<typeof FoundryIconLlmResultSchema>;

export interface FoundryIconLlmProvider {
  emitSvg(input: FoundryIconLlmInput): Promise<FoundryIconLlmResult>;
}
