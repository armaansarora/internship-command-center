// src/lib/foundry/canon/types.ts
import { z } from "zod";

export const FOUNDRY_CANON_VERSION = "1.0.0" as const;
export type FoundryCanonVersion = typeof FOUNDRY_CANON_VERSION;

export const FOUNDRY_CANON_KINDS = [
  "character",
  "palette",
  "typography",
  "motion-language",
  "space-tokens",
  "iconography-rules",
] as const;
export type FoundryCanonKind = (typeof FOUNDRY_CANON_KINDS)[number];

export const FoundryCanonKindSchema = z.enum(FOUNDRY_CANON_KINDS);

export const FoundryCanonHeaderSchema = z
  .object({
    kind: FoundryCanonKindSchema,
    schemaVersion: z.literal(FOUNDRY_CANON_VERSION),
    id: z.string().min(1).regex(/^[a-z0-9-]+$/, "canon id must be kebab-case lowercase"),
    revisedAt: z.string().datetime({ offset: true }),
    supersedes: z.array(z.string()).optional(),
  })
  .strict();
export type FoundryCanonHeader = z.infer<typeof FoundryCanonHeaderSchema>;

export interface FoundryCanonLoadResult<T> {
  header: FoundryCanonHeader;
  data: T;
  sourcePath: string;
  loadDurationMs: number;
}
