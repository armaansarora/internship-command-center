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

/**
 * Critical 1 + Critical 4: the spec is officially single-composite.
 *
 * Earlier drafts named "background", "midground", "ambient" (and a
 * planned "lighting") layers, but those were filter-derived pseudo
 * layers that did not stand alone. The honest manifest declares one
 * `composite` layer per variant and an explicit `kind` discriminator
 * so downstream consumers can branch when real layers ship.
 */
export const FOUNDRY_FLOOR_COMPOSITE_KINDS = ["single-composite"] as const;
export type FoundryFloorCompositeKind =
  (typeof FOUNDRY_FLOOR_COMPOSITE_KINDS)[number];

export const FOUNDRY_FLOOR_LAYER_NAMES = ["composite"] as const;
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
    kind: z.enum(FOUNDRY_FLOOR_COMPOSITE_KINDS),
    layers: z.array(FoundryFloorLayerManifestSchema).length(1),
    perceptualHash: z.string().regex(/^[0-9a-f]{16}$/),
  })
  .strict();
export type FoundryFloorVariantManifest = z.infer<
  typeof FoundryFloorVariantManifestSchema
>;
