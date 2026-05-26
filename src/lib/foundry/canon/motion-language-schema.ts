// src/lib/foundry/canon/motion-language-schema.ts
import { z } from "zod";
import { FoundryCanonHeaderSchema } from "./types";

const MotionHeaderSchema = FoundryCanonHeaderSchema.extend({ kind: z.literal("motion-language") });

export const FoundryMotionLanguageCanonSchema = z
  .object({
    header: MotionHeaderSchema,
    easings: z.record(z.string().min(1), z.string().min(1)),
    durations: z.record(z.string().min(1), z.number().int().nonnegative()),
    principles: z.array(z.string().min(1)),
  })
  .strict();
export type FoundryMotionLanguageCanon = z.infer<typeof FoundryMotionLanguageCanonSchema>;
