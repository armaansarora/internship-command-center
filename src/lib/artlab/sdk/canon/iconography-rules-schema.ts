// src/lib/foundry/canon/iconography-rules-schema.ts
import { z } from "zod";
import { FoundryCanonHeaderSchema } from "./types";

const IconoHeaderSchema = FoundryCanonHeaderSchema.extend({ kind: z.literal("iconography-rules") });

export const FOUNDRY_ICON_WEIGHTS = ["thin", "regular", "medium", "bold"] as const;
export type FoundryIconWeight = (typeof FOUNDRY_ICON_WEIGHTS)[number];

export const FoundryIconographyRulesCanonSchema = z
  .object({
    header: IconoHeaderSchema,
    strokeWidthPx: z.number().positive(),
    cornerRadiusPx: z.number().nonnegative(),
    weight: z.enum(FOUNDRY_ICON_WEIGHTS),
    gridSizePx: z.number().int().positive(),
    forbiddenStyles: z.array(z.string().min(1)),
  })
  .strict();
export type FoundryIconographyRulesCanon = z.infer<typeof FoundryIconographyRulesCanonSchema>;
