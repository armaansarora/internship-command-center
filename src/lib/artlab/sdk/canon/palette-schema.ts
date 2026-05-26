// src/lib/foundry/canon/palette-schema.ts
import { z } from "zod";
import { FoundryCanonHeaderSchema } from "./types";

const PaletteHeaderSchema = FoundryCanonHeaderSchema.extend({ kind: z.literal("palette") });

export const FoundryPaletteCanonSchema = z
  .object({
    header: PaletteHeaderSchema,
    scope: z.enum(["global", "floor", "character"]),
    floorId: z.string().min(1).optional(),
    tokens: z.record(z.string().min(1), z.string().min(1)),
    notes: z.string().optional(),
  })
  .strict();
export type FoundryPaletteCanon = z.infer<typeof FoundryPaletteCanonSchema>;
