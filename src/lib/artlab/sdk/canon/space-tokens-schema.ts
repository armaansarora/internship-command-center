// src/lib/artlab/sdk/canon/space-tokens-schema.ts
import { z } from "zod";
import { ArtLabCanonHeaderSchema } from "./types";

const SpaceHeaderSchema = ArtLabCanonHeaderSchema.extend({ kind: z.literal("space-tokens") });

export const ArtLabSpaceTokensCanonSchema = z
  .object({
    header: SpaceHeaderSchema,
    gutterPx: z.number().int().positive(),
    radiusPx: z.record(z.string().min(1), z.number().int().nonnegative()),
    glassBlurPx: z.number().int().nonnegative(),
    glassOpacity: z.number().min(0).max(1),
  })
  .strict();
export type ArtLabSpaceTokensCanon = z.infer<typeof ArtLabSpaceTokensCanonSchema>;
