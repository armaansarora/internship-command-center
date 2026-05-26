import { z } from "zod";

export const FOUNDRY_SPRITE_ACTIONS = [
  "idle",
  "wave",
  "nod",
  "celebrate",
] as const;
export type FoundrySpriteAction = (typeof FOUNDRY_SPRITE_ACTIONS)[number];

export const FOUNDRY_SPRITE_FORMATS = ["sprite", "lottie"] as const;
export type FoundrySpriteFormat = (typeof FOUNDRY_SPRITE_FORMATS)[number];

export const FoundrySpriteAnimatorInputSchema = z
  .object({
    runId: z.string().uuid(),
    sourcePackId: z.string().min(1),
    action: z.enum(FOUNDRY_SPRITE_ACTIONS),
    format: z.enum(FOUNDRY_SPRITE_FORMATS),
    requestedBy: z.enum(["agent", "human", "telegram", "cli"]),
    frameCount: z.number().int().min(8).max(24).default(12),
    fps: z.number().int().min(8).max(30).default(12),
    motionCurve: z.string().min(1).default("breathing-12fps"),
    loops: z.boolean().default(true),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type FoundrySpriteAnimatorInput = z.infer<
  typeof FoundrySpriteAnimatorInputSchema
>;

export const FoundrySpriteFrameManifestSchema = z
  .object({
    index: z.number().int().min(0),
    path: z.string().min(1),
    perceptualHash: z.string().regex(/^[0-9a-f]{16}$/),
  })
  .strict();
export type FoundrySpriteFrameManifest = z.infer<
  typeof FoundrySpriteFrameManifestSchema
>;

export const FoundrySpriteTransitionSchema = z
  .object({
    fromFrame: z.number().int().min(0),
    toFrame: z.number().int().min(0),
    easing: z.string().min(1),
  })
  .strict();
export type FoundrySpriteTransition = z.infer<typeof FoundrySpriteTransitionSchema>;

export const FoundrySpriteSequenceManifestSchema = z
  .object({
    frames: z.array(FoundrySpriteFrameManifestSchema).min(1),
    fps: z.number().int().min(1),
    loops: z.boolean(),
    frame_count: z.number().int().min(1),
    total_duration_ms: z.number().int().min(1),
    transitions: z.array(FoundrySpriteTransitionSchema),
  })
  .strict();
export type FoundrySpriteSequenceManifest = z.infer<
  typeof FoundrySpriteSequenceManifestSchema
>;

export const FoundryLottieAnimationManifestSchema = z
  .object({
    lottiePath: z.string().min(1),
    version: z.string().min(1),
    durationMs: z.number().int().min(1),
    motionCurve: z.string().min(1),
  })
  .strict();
export type FoundryLottieAnimationManifest = z.infer<
  typeof FoundryLottieAnimationManifestSchema
>;
