// src/lib/artlab/contracts/animation-contract.ts
import { z } from "zod";

export const ANIMATION_CONTRACT = {
  minFrames: 12,
  maxFrames: 48,
  fps: 24,
  requiresReducedMotionFallback: true,
} as const;

export const AnimationSlotSpecSchema = z
  .object({
    slotId: z.string().min(1),
    purpose: z.enum(["ambient", "transition", "loading", "hover"]),
    frameCount: z.number().int().min(ANIMATION_CONTRACT.minFrames).max(ANIMATION_CONTRACT.maxFrames),
  })
  .strict();
export type AnimationSlotSpec = z.infer<typeof AnimationSlotSpecSchema>;

export function validateAnimationSlotSpec(spec: unknown): AnimationSlotSpec {
  return AnimationSlotSpecSchema.parse(spec);
}
