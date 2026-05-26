import { z } from "zod";

export const FOUNDRY_IMAGE_ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:3", "3:4"] as const;
export type FoundryImageAspectRatio = (typeof FOUNDRY_IMAGE_ASPECT_RATIOS)[number];

export const FOUNDRY_IMAGE_PROVIDER_MODES = ["real", "mock", "placeholder"] as const;
export type FoundryImageProviderMode = (typeof FOUNDRY_IMAGE_PROVIDER_MODES)[number];

export const FoundryImageProviderResultSchema = z
  .object({
    mode: z.enum(FOUNDRY_IMAGE_PROVIDER_MODES),
    bytes: z.instanceof(Buffer),
    contentType: z.enum(["image/png", "image/webp", "image/jpeg"]),
    widthPx: z.number().int().positive(),
    heightPx: z.number().int().positive(),
    costCents: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    providerId: z.string().min(1),
    seed: z.number().int().optional(),
  })
  .strict();
export type FoundryImageProviderResult = z.infer<typeof FoundryImageProviderResultSchema>;

export interface FoundryImageProviderInput {
  prompt: string;
  aspectRatio: FoundryImageAspectRatio;
  laneIndex: number;
  referenceImageBytes?: Buffer;
  seed?: number;
}

export interface FoundryImageProvider {
  readonly id: string;
  generate(input: FoundryImageProviderInput): Promise<FoundryImageProviderResult>;
}
