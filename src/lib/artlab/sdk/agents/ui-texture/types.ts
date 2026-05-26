// src/lib/foundry/agents/ui-texture/types.ts
import { z } from "zod";

export const FOUNDRY_UI_TEXTURE_KINDS = ["icon", "texture"] as const;
export type FoundryUiTextureKind = (typeof FOUNDRY_UI_TEXTURE_KINDS)[number];

const NAME_RE = /^[a-z][a-z0-9-]{0,60}$/;

const IconInputSchema = z
  .object({
    runId: z.string().uuid(),
    name: z.string().regex(NAME_RE),
    kind: z.literal("icon"),
    requestedBy: z.enum(["agent", "human", "telegram", "cli"]),
    ariaLabel: z.string().min(2).max(120),
    weights: z
      .array(z.enum(["regular", "bold", "thin"]))
      .min(1)
      .max(3)
      .default(["regular"]),
    seed: z.number().int().min(0).optional(),
  })
  .strict();

const TextureInputSchema = z
  .object({
    runId: z.string().uuid(),
    name: z.string().regex(NAME_RE),
    kind: z.literal("texture"),
    requestedBy: z.enum(["agent", "human", "telegram", "cli"]),
    tileMode: z.enum(["repeat", "repeat-x", "repeat-y", "no-repeat"]).default("repeat"),
    seed: z.number().int().min(0).optional(),
  })
  .strict();

export const FoundryUiTextureInputSchema = z.discriminatedUnion("kind", [
  IconInputSchema,
  TextureInputSchema,
]);
export type FoundryUiTextureInput = z.input<typeof FoundryUiTextureInputSchema>;
export type ParsedFoundryUiTextureInput = z.infer<
  typeof FoundryUiTextureInputSchema
>;

export const FoundryUiIconManifestSchema = z
  .object({
    name: z.string().regex(NAME_RE),
    svgPath: z.string().min(1),
    ariaLabel: z.string().min(2).max(120),
    strokeWidthPx: z.number().positive(),
    viewBox: z.string().regex(/^-?\d+ -?\d+ \d+ \d+$/),
  })
  .strict();
export type FoundryUiIconManifest = z.infer<typeof FoundryUiIconManifestSchema>;

export const FoundryUiTextureManifestSchema = z
  .object({
    name: z.string().regex(NAME_RE),
    pngPath: z.string().min(1),
    normalMapPath: z.string().min(1),
    tileMode: z.enum(["repeat", "repeat-x", "repeat-y", "no-repeat"]),
    targetResolutionPx: z.number().int().positive(),
  })
  .strict();
export type FoundryUiTextureManifest = z.infer<
  typeof FoundryUiTextureManifestSchema
>;
