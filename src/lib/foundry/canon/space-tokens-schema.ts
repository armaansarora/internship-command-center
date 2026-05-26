// src/lib/foundry/canon/space-tokens-schema.ts
import { z } from "zod";
import { FoundryCanonHeaderSchema } from "./types";

const SpaceHeaderSchema = FoundryCanonHeaderSchema.extend({ kind: z.literal("space-tokens") });

export const FoundrySpaceTokensCanonSchema = z
  .object({
    header: SpaceHeaderSchema,
    gutterPx: z.number().int().positive(),
    radiusPx: z.record(z.string().min(1), z.number().int().nonnegative()),
    glassBlurPx: z.number().int().nonnegative(),
    glassOpacity: z.number().min(0).max(1),
  })
  .strict();
export type FoundrySpaceTokensCanon = z.infer<typeof FoundrySpaceTokensCanonSchema>;
