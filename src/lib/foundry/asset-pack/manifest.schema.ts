import { z } from "zod";
import { FOUNDRY_ASSET_KINDS, FOUNDRY_AGENT_KINDS, FOUNDRY_ASSET_PACK_VERSION } from "./constants";

const Sha256Hex = z.string().regex(/^[a-f0-9]{64}$/, "sha256 must be 64 hex chars (lowercase)");

const AppPath = z
  .string()
  .min(1)
  .refine((p) => !p.includes(".."), "appPath may not contain '..'")
  .refine(
    (p) =>
      p.startsWith("public/") ||
      p.startsWith("src/components/") ||
      p.startsWith("src/lib/visual-assets/"),
    "appPath must start with public/, src/components/, or src/lib/visual-assets/",
  );

export const FoundryAssetPackPayloadFileSchema = z
  .object({
    relPath: z.string().min(1).refine((p) => !p.includes(".."), "relPath may not contain '..'"),
    sha256: Sha256Hex,
    bytes: z.number().int().nonnegative(),
  })
  .strict();

export const FoundryAssetPackPayloadSchema = z
  .object({
    files: z.array(FoundryAssetPackPayloadFileSchema).min(1),
    primaryFileRelPath: z.string().min(1),
  })
  .strict()
  .refine(
    (p) => p.files.some((f) => f.relPath === p.primaryFileRelPath),
    "primaryFileRelPath must reference one of the payload files",
  );

export const FoundryAssetPackCanonRefsSchema = z
  .object({
    characterId: z.string().min(1).nullable(),
    paletteRef: z.string().min(1).nullable(),
    typographyRef: z.string().min(1).nullable(),
    motionLanguageRef: z.string().min(1).nullable(),
  })
  .strict()
  .refine(
    (r) =>
      r.characterId !== null || r.paletteRef !== null || r.typographyRef !== null || r.motionLanguageRef !== null,
    "manifest must reference at least one canon record",
  );

export const FoundryAssetPackDimensionsSchema = z
  .object({
    sourceWidthPx: z.number().int().positive(),
    sourceHeightPx: z.number().int().positive(),
    displayWidthPx: z.number().int().positive(),
    displayHeightPx: z.number().int().positive(),
    aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:3", "3:4"]),
  })
  .strict();

export const FoundryAssetPackIntendedSlotSchema = z
  .object({
    slotId: z.string().min(1).regex(/^[a-z0-9/_-]+$/, "slotId must be kebab/path style lowercase"),
    appPath: AppPath,
    component: z.string().min(1).nullable(),
    requiresGsap: z.boolean(),
  })
  .strict();

export const FoundryGsapCueSchema = z
  .object({
    cueId: z.string().min(1),
    targetSelector: z.string().min(1),
    timeline: z.string().min(1),
    durationMs: z.number().int().nonnegative(),
    easing: z.string().min(1),
  })
  .strict();

export const FoundryAccessibilitySchema = z
  .object({
    altText: z.string().min(1),
    role: z.enum(["img", "presentation", "button", "link", "none"]),
    prefersReducedMotionStrategy: z.enum(["static-fallback", "no-motion", "respect-system"]),
  })
  .strict();

export const FoundryGenerationMetadataSchema = z
  .object({
    agentName: z.enum(FOUNDRY_AGENT_KINDS),
    provider: z.string().min(1),
    modelId: z.string().min(1),
    seed: z.number().int(),
    costCents: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    generatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const FoundryAssetPackManifestSchema = z
  .object({
    manifestVersion: z.literal(FOUNDRY_ASSET_PACK_VERSION),
    packId: z.string().min(1),
    kind: z.enum(FOUNDRY_ASSET_KINDS),
    agent: z.enum(FOUNDRY_AGENT_KINDS),
    canonRefs: FoundryAssetPackCanonRefsSchema,
    dimensions: FoundryAssetPackDimensionsSchema,
    colorTokensUsed: z.array(z.string().min(1)),
    intendedSlot: FoundryAssetPackIntendedSlotSchema,
    gsapCues: z.array(FoundryGsapCueSchema),
    accessibility: FoundryAccessibilitySchema,
    integrationSnippetTemplate: z.string().min(1),
    payload: FoundryAssetPackPayloadSchema,
    generation: FoundryGenerationMetadataSchema,
  })
  .strict();
export type FoundryAssetPackManifest = z.infer<typeof FoundryAssetPackManifestSchema>;
