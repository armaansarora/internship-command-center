import path from "node:path";
import { z } from "zod";
import { FOUNDRY_ASSET_KINDS, FOUNDRY_AGENT_KINDS, FOUNDRY_ASSET_PACK_VERSION } from "./constants";

const Sha256Hex = z.string().regex(/^[a-f0-9]{64}$/, "sha256 must be 64 hex chars (lowercase)");

export const APP_PATH_PREFIXES = ["public/", "src/components/", "src/lib/visual-assets/"] as const;

function hasPercentEncoding(s: string): boolean {
  return /%[0-9a-fA-F]{2}/.test(s);
}

function decodeForInspection(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    // Malformed encoding is itself suspicious; treat as the raw string so the
    // downstream `..`, backslash, and normalisation checks still trip.
    return s;
  }
}

/**
 * Defence-in-depth path-safety check used by `appPath` and payload `relPath`.
 * Also exported so the slot registry and the pack writer can apply the
 * identical attack-vector rejections (no duplicate, drifted copies).
 *
 * Rejects:
 *   - empty strings
 *   - NUL bytes (filesystem boundary truncation)
 *   - backslashes (Windows separator + traversal smuggling)
 *   - any percent-encoded sequence (no `%2e`, `%2f`, `%5c`, …)
 *   - leading `/` (absolute path), `~` (home expansion), `C:` (drive prefix)
 *   - any literal `..` segment after `path.posix.normalize` round-trip
 *   - paths that re-resolve outside the allow-listed prefix
 *   - paths whose normalised form differs from the input (double slash,
 *     `./` segments, trailing `/`) — forces a canonical representation
 */
export function isPathSafeAgainstTraversal(
  input: string,
  prefixes: ReadonlyArray<string> | null,
): boolean {
  if (input.length === 0) return false;
  if (input.includes("\0")) return false;
  if (input.includes("\\")) return false;
  if (hasPercentEncoding(input)) return false;
  // Decoded form must also be clean — defence against double-decoding upstream.
  const decoded = decodeForInspection(input);
  if (decoded !== input) return false;
  if (input.startsWith("/")) return false;
  if (input.startsWith("~")) return false;
  if (/^[a-zA-Z]:/.test(input)) return false;

  const normalised = path.posix.normalize(input);
  // Normalisation must be a no-op — rejects `public//evil`, `./foo`, `foo/.`,
  // and any input where the canonical form differs from what the caller wrote.
  if (normalised !== input) return false;
  // Belt-and-braces: a normalised path that still contains `..` segments has
  // escaped its root.
  if (normalised.split("/").includes("..")) return false;

  if (prefixes !== null) {
    return prefixes.some((prefix) => normalised.startsWith(prefix));
  }
  return true;
}

const AppPath = z
  .string()
  .refine(
    (p) => isPathSafeAgainstTraversal(p, APP_PATH_PREFIXES),
    "appPath must be a canonical, allow-listed path (no traversal, no encoding, no backslash, no absolute or drive prefix)",
  );

export const FoundryAssetPackPayloadFileSchema = z
  .object({
    relPath: z
      .string()
      .refine(
        (p) => isPathSafeAgainstTraversal(p, null),
        "relPath must be a canonical relative path (no traversal, no encoding, no backslash, no leading slash)",
      ),
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
