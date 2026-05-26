// src/lib/artlab/sdk/canon/typography-schema.ts
import { z } from "zod";
import { ArtLabCanonHeaderSchema } from "./types";

const TypographyHeaderSchema = ArtLabCanonHeaderSchema.extend({ kind: z.literal("typography") });

export const ARTLAB_TYPOGRAPHY_FAMILY_ROLES = ["heading", "body", "mono"] as const;
export type ArtLabTypographyFamilyRole = (typeof ARTLAB_TYPOGRAPHY_FAMILY_ROLES)[number];

export const ArtLabTypographyCanonSchema = z
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
export type ArtLabTypographyCanon = z.infer<typeof ArtLabTypographyCanonSchema>;
