// src/lib/artlab/sdk/canon/motion-language-schema.ts
import { z } from "zod";
import { ArtLabCanonHeaderSchema } from "./types";

const MotionHeaderSchema = ArtLabCanonHeaderSchema.extend({ kind: z.literal("motion-language") });

export const ArtLabMotionLanguageCanonSchema = z
  .object({
    header: MotionHeaderSchema,
    easings: z.record(z.string().min(1), z.string().min(1)),
    durations: z.record(z.string().min(1), z.number().int().nonnegative()),
    principles: z.array(z.string().min(1)),
  })
  .strict();
export type ArtLabMotionLanguageCanon = z.infer<typeof ArtLabMotionLanguageCanonSchema>;
