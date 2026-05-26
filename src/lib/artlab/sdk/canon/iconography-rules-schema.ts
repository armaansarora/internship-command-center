// src/lib/artlab/sdk/canon/iconography-rules-schema.ts
import { z } from "zod";
import { ArtLabCanonHeaderSchema } from "./types";

const IconoHeaderSchema = ArtLabCanonHeaderSchema.extend({ kind: z.literal("iconography-rules") });

export const ARTLAB_ICON_WEIGHTS = ["thin", "regular", "medium", "bold"] as const;
export type ArtLabIconWeight = (typeof ARTLAB_ICON_WEIGHTS)[number];

export const ArtLabIconographyRulesCanonSchema = z
  .object({
    header: IconoHeaderSchema,
    strokeWidthPx: z.number().positive(),
    cornerRadiusPx: z.number().nonnegative(),
    weight: z.enum(ARTLAB_ICON_WEIGHTS),
    gridSizePx: z.number().int().positive(),
    forbiddenStyles: z.array(z.string().min(1)),
  })
  .strict();
export type ArtLabIconographyRulesCanon = z.infer<typeof ArtLabIconographyRulesCanonSchema>;
