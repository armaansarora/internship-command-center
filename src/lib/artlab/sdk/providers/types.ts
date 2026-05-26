import { z } from "zod";

export const ARTLAB_IMAGE_ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:3", "3:4"] as const;
export type ArtLabImageAspectRatio = (typeof ARTLAB_IMAGE_ASPECT_RATIOS)[number];

export const ARTLAB_IMAGE_PROVIDER_MODES = ["real", "mock", "placeholder"] as const;
export type ArtLabImageProviderMode = (typeof ARTLAB_IMAGE_PROVIDER_MODES)[number];

export const ArtLabImageProviderResultSchema = z
  .object({
    mode: z.enum(ARTLAB_IMAGE_PROVIDER_MODES),
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
export type ArtLabImageProviderResult = z.infer<typeof ArtLabImageProviderResultSchema>;

export interface ArtLabImageProviderInput {
  prompt: string;
  aspectRatio: ArtLabImageAspectRatio;
  laneIndex: number;
  referenceImageBytes?: Buffer;
  seed?: number;
}

export interface ArtLabImageProvider {
  readonly id: string;
  generate(input: ArtLabImageProviderInput): Promise<ArtLabImageProviderResult>;
}
