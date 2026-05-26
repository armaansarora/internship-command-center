import { z } from "zod";

export const ARTLAB_SPRITE_ACTIONS = [
  "idle",
  "wave",
  "nod",
  "celebrate",
] as const;
export type ArtLabSpriteAction = (typeof ARTLAB_SPRITE_ACTIONS)[number];

export const ARTLAB_SPRITE_FORMATS = ["sprite", "lottie"] as const;
export type ArtLabSpriteFormat = (typeof ARTLAB_SPRITE_FORMATS)[number];

export const ArtLabSpriteAnimatorInputSchema = z
  .object({
    runId: z.string().uuid(),
    sourcePackId: z.string().min(1),
    action: z.enum(ARTLAB_SPRITE_ACTIONS),
    format: z.enum(ARTLAB_SPRITE_FORMATS),
    requestedBy: z.enum(["agent", "human", "telegram", "cli"]),
    frameCount: z.number().int().min(8).max(24).default(12),
    fps: z.number().int().min(8).max(30).default(12),
    motionCurve: z.string().min(1).default("breathing-12fps"),
    loops: z.boolean().default(true),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type ArtLabSpriteAnimatorInput = z.infer<
  typeof ArtLabSpriteAnimatorInputSchema
>;

export const ArtLabSpriteFrameManifestSchema = z
  .object({
    index: z.number().int().min(0),
    path: z.string().min(1),
    perceptualHash: z.string().regex(/^[0-9a-f]{16}$/),
  })
  .strict();
export type ArtLabSpriteFrameManifest = z.infer<
  typeof ArtLabSpriteFrameManifestSchema
>;

export const ArtLabSpriteTransitionSchema = z
  .object({
    fromFrame: z.number().int().min(0),
    toFrame: z.number().int().min(0),
    easing: z.string().min(1),
  })
  .strict();
export type ArtLabSpriteTransition = z.infer<typeof ArtLabSpriteTransitionSchema>;

export const ArtLabSpriteSequenceManifestSchema = z
  .object({
    frames: z.array(ArtLabSpriteFrameManifestSchema).min(1),
    fps: z.number().int().min(1),
    loops: z.boolean(),
    frame_count: z.number().int().min(1),
    total_duration_ms: z.number().int().min(1),
    transitions: z.array(ArtLabSpriteTransitionSchema),
  })
  .strict();
export type ArtLabSpriteSequenceManifest = z.infer<
  typeof ArtLabSpriteSequenceManifestSchema
>;

export const ArtLabLottieAnimationManifestSchema = z
  .object({
    lottiePath: z.string().min(1),
    version: z.string().min(1),
    durationMs: z.number().int().min(1),
    motionCurve: z.string().min(1),
  })
  .strict();
export type ArtLabLottieAnimationManifest = z.infer<
  typeof ArtLabLottieAnimationManifestSchema
>;
