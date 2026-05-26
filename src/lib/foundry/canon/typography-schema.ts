// src/lib/foundry/canon/typography-schema.ts
import { z } from "zod";
import { FoundryCanonHeaderSchema } from "./types";

const TypographyHeaderSchema = FoundryCanonHeaderSchema.extend({ kind: z.literal("typography") });

export const FOUNDRY_TYPOGRAPHY_FAMILY_ROLES = ["heading", "body", "mono"] as const;
export type FoundryTypographyFamilyRole = (typeof FOUNDRY_TYPOGRAPHY_FAMILY_ROLES)[number];

export const FoundryTypographyCanonSchema = z
  .object({
    header: TypographyHeaderSchema,
    families: z.object({
      heading: z.string().min(1),
      body: z.string().min(1),
      mono: z.string().min(1),
    }).strict(),
    ramp: z
      .array(
        z
          .object({
            token: z.string().min(1),
            sizePx: z.number().positive(),
            weight: z.number().int().min(100).max(900),
            lineHeight: z.number().positive(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type FoundryTypographyCanon = z.infer<typeof FoundryTypographyCanonSchema>;
