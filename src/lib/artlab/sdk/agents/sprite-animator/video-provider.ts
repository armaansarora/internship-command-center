import { z } from "zod";

export const ArtLabVideoProviderInputSchema = z
  .object({
    prompt: z.string().min(1),
    frameCount: z.number().int().min(2).max(120),
    fps: z.number().int().min(1).max(60),
    referenceImageBytes: z.instanceof(Buffer).optional(),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type ArtLabVideoProviderInput = z.infer<
  typeof ArtLabVideoProviderInputSchema
>;

export const ArtLabVideoProviderResultSchema = z
  .object({
    frames: z.array(z.instanceof(Buffer)).min(1),
    contentType: z.literal("image/png"),
    mode: z.enum(["real", "mock"]),
    costCents: z.number().int().min(0),
    durationMs: z.number().int().min(0),
  })
  .strict();
export type ArtLabVideoProviderResult = z.infer<
  typeof ArtLabVideoProviderResultSchema
>;

export interface ArtLabVideoProvider {
  generateFrames(
    input: ArtLabVideoProviderInput,
  ): Promise<ArtLabVideoProviderResult>;
}
