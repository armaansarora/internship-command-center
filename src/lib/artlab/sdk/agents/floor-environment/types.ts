import { z } from "zod";

export const ARTLAB_FLOOR_TIME_STATES = [
  "dawn",
  "morning",
  "midday",
  "afternoon",
  "dusk",
  "evening",
  "night",
] as const;
export type ArtLabFloorTimeState = (typeof ARTLAB_FLOOR_TIME_STATES)[number];

/**
 * Critical 1 + Critical 4: the spec is officially single-composite.
 *
 * Earlier drafts named "background", "midground", "ambient" (and a
 * planned "lighting") layers, but those were filter-derived pseudo
 * layers that did not stand alone. The honest manifest declares one
 * `composite` layer per variant and an explicit `kind` discriminator
 * so downstream consumers can branch when real layers ship.
 */
export const ARTLAB_FLOOR_COMPOSITE_KINDS = ["single-composite"] as const;
export type ArtLabFloorCompositeKind =
  (typeof ARTLAB_FLOOR_COMPOSITE_KINDS)[number];

export const ARTLAB_FLOOR_LAYER_NAMES = ["composite"] as const;
export type ArtLabFloorLayerName = (typeof ARTLAB_FLOOR_LAYER_NAMES)[number];

const FLOOR_SLUG_RE = /^[a-z][a-z0-9-]{1,40}$/;

export const ArtLabFloorEnvironmentInputSchema = z
  .object({
    runId: z.string().uuid(),
    floorSlug: z.string().regex(FLOOR_SLUG_RE),
    requestedBy: z.enum(["agent", "human", "telegram", "cli"]),
    timeStates: z
      .array(z.enum(ARTLAB_FLOOR_TIME_STATES))
      .min(1)
      .max(ARTLAB_FLOOR_TIME_STATES.length)
      .default([...ARTLAB_FLOOR_TIME_STATES]),
    seed: z.number().int().min(0).optional(),
  })
  .strict();
export type ArtLabFloorEnvironmentInput = z.infer<
  typeof ArtLabFloorEnvironmentInputSchema
>;

export const ArtLabFloorLayerManifestSchema = z
  .object({
    name: z.enum(ARTLAB_FLOOR_LAYER_NAMES),
    path: z.string().min(1),
    zIndex: z.number().int().min(0).max(9),
    hasAlpha: z.boolean(),
  })
  .strict();
export type ArtLabFloorLayerManifest = z.infer<
  typeof ArtLabFloorLayerManifestSchema
>;

export const ArtLabFloorVariantManifestSchema = z
  .object({
    timeState: z.enum(ARTLAB_FLOOR_TIME_STATES),
    kind: z.enum(ARTLAB_FLOOR_COMPOSITE_KINDS),
    layers: z.array(ArtLabFloorLayerManifestSchema).length(1),
    perceptualHash: z.string().regex(/^[0-9a-f]{16}$/),
  })
  .strict();
export type ArtLabFloorVariantManifest = z.infer<
  typeof ArtLabFloorVariantManifestSchema
>;

/**
 * Critical 2 followup: known SDK-level gaps surfaced at the manifest
 * root so downstream consumers can branch on them without parsing the
 * deeper `qa` block.
 *
 * Be HONEST in the manifest:
 * - `roomElementsPixelVerification` — `todo-post-launch`: the prior
 *   string-comparison gate was theatrical and has been removed. A real
 *   vision-LLM check against canon.requiredElements is future work.
 * - `perLayerRenders` — `out-of-scope-for-sdk-launch`: today every
 *   variant ships as a single composite (Critical 1 + Critical 4).
 *   Independent per-layer renders remain a future option.
 */
export const ARTLAB_FLOOR_GAP_STATUSES = [
  "todo-post-launch",
  "out-of-scope-for-sdk-launch",
] as const;
export type ArtLabFloorGapStatus =
  (typeof ARTLAB_FLOOR_GAP_STATUSES)[number];

export const ArtLabFloorManifestGapSchema = z
  .object({
    status: z.enum(ARTLAB_FLOOR_GAP_STATUSES),
    reason: z.string().min(1),
  })
  .strict();
export type ArtLabFloorManifestGap = z.infer<
  typeof ArtLabFloorManifestGapSchema
>;

export const ArtLabFloorManifestGapsSchema = z
  .object({
    roomElementsPixelVerification: ArtLabFloorManifestGapSchema,
    perLayerRenders: ArtLabFloorManifestGapSchema,
  })
  .strict();
export type ArtLabFloorManifestGaps = z.infer<
  typeof ArtLabFloorManifestGapsSchema
>;
