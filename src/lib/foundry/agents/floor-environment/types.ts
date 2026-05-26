import { z } from "zod";

export const FOUNDRY_FLOOR_TIME_STATES = [
  "dawn",
  "morning",
  "midday",
  "afternoon",
  "dusk",
  "evening",
  "night",
] as const;
export type FoundryFloorTimeState = (typeof FOUNDRY_FLOOR_TIME_STATES)[number];

export const FOUNDRY_FLOOR_LAYER_NAMES = [
  "background",
  "midground",
  "ambient",
] as const;
export type FoundryFloorLayerName = (typeof FOUNDRY_FLOOR_LAYER_NAMES)[number];

const FLOOR_SLUG_RE = /^[a-z][a-z0-9-]{1,40}$/;

export const FoundryFloorEnvironmentInputSchema = z
  .object({
    runId: z.string().uuid(),
    floorSlug: z.string().regex(FLOOR_SLUG_RE),
    requestedBy: z.enum(["agent", "human", "telegram", "cli"]),
    timeStates: z
      .array(z.enum(FOUNDRY_FLOOR_TIME_STATES))
      .min(1)
      .max(FOUNDRY_FLOOR_TIME_STATES.length)
      .default([...FOUNDRY_FLOOR_TIME_STATES]),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type FoundryFloorEnvironmentInput = z.infer<
  typeof FoundryFloorEnvironmentInputSchema
>;

export const FoundryFloorLayerManifestSchema = z
  .object({
    name: z.enum(FOUNDRY_FLOOR_LAYER_NAMES),
    path: z.string().min(1),
    zIndex: z.number().int().min(0).max(9),
    hasAlpha: z.boolean(),
  })
  .strict();
export type FoundryFloorLayerManifest = z.infer<
  typeof FoundryFloorLayerManifestSchema
>;

export const FoundryFloorVariantManifestSchema = z
  .object({
    timeState: z.enum(FOUNDRY_FLOOR_TIME_STATES),
    layers: z.array(FoundryFloorLayerManifestSchema).length(3),
    perceptualHash: z.string().regex(/^[0-9a-f]{16}$/),
  })
  .strict();
export type FoundryFloorVariantManifest = z.infer<
  typeof FoundryFloorVariantManifestSchema
>;
