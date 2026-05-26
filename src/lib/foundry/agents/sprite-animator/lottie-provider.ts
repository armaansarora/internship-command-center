import { z } from "zod";
import { FOUNDRY_SPRITE_ACTIONS } from "./types";

export const FoundryLottieProviderInputSchema = z
  .object({
    motionCurve: z.string().min(1),
    durationMs: z.number().int().min(1),
    action: z.enum(FOUNDRY_SPRITE_ACTIONS),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type FoundryLottieProviderInput = z.infer<
  typeof FoundryLottieProviderInputSchema
>;

export const FoundryLottieProviderResultSchema = z
  .object({
    lottieJson: z.string().min(2),
    mode: z.enum(["real", "mock"]),
    costCents: z.number().int().min(0),
    durationMs: z.number().int().min(0),
  })
  .strict();
export type FoundryLottieProviderResult = z.infer<
  typeof FoundryLottieProviderResultSchema
>;

export interface FoundryLottieProvider {
  authorLottie(
    input: FoundryLottieProviderInput,
  ): Promise<FoundryLottieProviderResult>;
}
