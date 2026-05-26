// src/lib/artlab/sdk/agents/ui-texture/llm-provider.ts
import { z } from "zod";

export const ArtLabIconLlmInputSchema = z
  .object({
    name: z.string().min(1),
    ariaLabel: z.string().min(1),
    strokeWidthPx: z.number().positive(),
    viewBox: z.string().regex(/^-?\d+ -?\d+ \d+ \d+$/),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type ArtLabIconLlmInput = z.infer<typeof ArtLabIconLlmInputSchema>;

export const ArtLabIconLlmResultSchema = z
  .object({
    svg: z.string().min(1),
    mode: z.enum(["real", "mock"]),
    costCents: z.number().int().min(0),
    durationMs: z.number().int().min(0),
  })
  .strict();
export type ArtLabIconLlmResult = z.infer<typeof ArtLabIconLlmResultSchema>;

export interface ArtLabIconLlmProvider {
  emitSvg(input: ArtLabIconLlmInput): Promise<ArtLabIconLlmResult>;
}
