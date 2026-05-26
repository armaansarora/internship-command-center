import { z } from "zod";
import { FOUNDRY_SPRITE_ACTIONS } from "./types";

export const FoundryLottieProviderInputSchema = z
  .object({
    motionCurve: z.string().min(1),
    durationMs: z.number().int().min(1),
    action: z.enum(FOUNDRY_SPRITE_ACTIONS),
    seed: z.number().int().min(0).optional(),
    /**
     * Critical 3: anchor PNG bytes so the provider can embed (or
     * reference) the source character art in the Lottie output. The
     * downstream `lottie-identity` QA gate verifies at least one
     * embedded asset matches the source pack's perceptual hash.
     * Optional only because Lottie isn't always image-bearing in
     * principle; in practice production calls always pass this.
     */
    referenceImageBytes: z.instanceof(Buffer).optional(),
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
