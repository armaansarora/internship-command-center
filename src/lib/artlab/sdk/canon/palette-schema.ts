// src/lib/artlab/sdk/canon/palette-schema.ts
import { z } from "zod";
import { ArtLabCanonHeaderSchema } from "./types";

const PaletteHeaderSchema = ArtLabCanonHeaderSchema.extend({ kind: z.literal("palette") });

export const ArtLabPaletteCanonSchema = z
  .object({
    header: PaletteHeaderSchema,
    scope: z.enum(["global", "floor", "character"]),
    floorId: z.string().min(1).optional(),
    tokens: z.record(z.string().min(1), z.string().min(1)),
    notes: z.string().optional(),
  })
  .strict();
export type ArtLabPaletteCanon = z.infer<typeof ArtLabPaletteCanonSchema>;
