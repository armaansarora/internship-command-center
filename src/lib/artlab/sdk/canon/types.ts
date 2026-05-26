// src/lib/artlab/sdk/canon/types.ts
import { z } from "zod";

export const ARTLAB_CANON_VERSION = "1.0.0" as const;
export type ArtLabCanonVersion = typeof ARTLAB_CANON_VERSION;

export const ARTLAB_CANON_KINDS = [
  "character",
  "palette",
  "typography",
  "motion-language",
  "space-tokens",
  "iconography-rules",
] as const;
export type ArtLabCanonKind = (typeof ARTLAB_CANON_KINDS)[number];

export const ArtLabCanonKindSchema = z.enum(ARTLAB_CANON_KINDS);

export const ArtLabCanonHeaderSchema = z
  .object({
    kind: ArtLabCanonKindSchema,
    schemaVersion: z.literal(ARTLAB_CANON_VERSION),
    id: z.string().min(1).regex(/^[a-z0-9-]+$/, "canon id must be kebab-case lowercase"),
    revisedAt: z.string().datetime({ offset: true }),
    supersedes: z.array(z.string()).optional(),
  })
  .strict();
export type ArtLabCanonHeader = z.infer<typeof ArtLabCanonHeaderSchema>;

export interface ArtLabCanonLoadResult<T> {
  header: ArtLabCanonHeader;
  data: T;
  sourcePath: string;
  loadDurationMs: number;
}
