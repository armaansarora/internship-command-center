import { z } from "zod";
import { ARTLAB_ASSET_KINDS } from "../mcp/tools";

/**
 * Schema for `.artlab/engine/promoted/<packId>/manifest.json` written at
 * promotion time by `promotion-runner.ts`. This is the on-disk shape every
 * downstream MCP reader (`asset_pack_list`, `asset_pack_get`) ingests, so it
 * MUST agree with the lighter `ManifestSchema` inlined in those handlers.
 *
 * Why not `ArtLabAssetPackManifestSchema` (the strict 15-field schema)?
 *
 * The strict schema mandates fields the promotion-runner cannot derive
 * without invasive new dependencies:
 *
 *   - `dimensions.sourceWidthPx/Height` (image-probe library — not currently
 *      a dependency of the runner)
 *   - `dimensions.aspectRatio` (string enum tied to probed dims)
 *   - `intendedSlot.appPath` (allow-listed path inside the registered slot
 *      registry — the runner doesn't know the slot at promotion time, only
 *      the target relative dir)
 *   - `intendedSlot.component`, `intendedSlot.requiresGsap`
 *   - `accessibility.altText` / `role` / `prefersReducedMotionStrategy`
 *   - `integrationSnippetTemplate`
 *   - `generation.{provider, modelId, seed, costCents, durationMs}`
 *
 * The runner is a path-scoped copy step — it has the source bytes, the
 * target path, the runId, and the canon characterId. Everything else is
 * the responsibility of the asset-pack BUILDER (see `build-asset-pack.ts`,
 * `legacy-shim.ts`) which runs upstream of promotion and emits the strict
 * shape into a SEPARATE staging directory.
 *
 * Promoted-pack manifests therefore carry the MINIMAL keys the MCP reader
 * needs to discover and surface the pack — packId, kind (MCP enum), slotId,
 * promotedAt, optional characterId/space, and the file list with sha256s
 * so a verifier can re-hash the bytes against the manifest's claim.
 */

const Sha256Hex = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "sha256 must be 64 hex chars (lowercase)");

export const ArtLabPromotedPackFileSchema = z
  .object({
    /** Pack-dir-relative POSIX path. Resolved against packDir by asset-pack-get. */
    path: z.string().min(1),
    /** "primary" for the headline asset; "secondary"/"frame"/"variant" otherwise. */
    role: z.string().min(1),
    /** sha256 of the payload bytes — lets a verifier re-hash to detect drift. */
    sha256: Sha256Hex,
    /** File size in bytes — sanity-check against on-disk stat. */
    bytes: z.number().int().min(0),
  })
  .strict();
export type ArtLabPromotedPackFile = z.infer<typeof ArtLabPromotedPackFileSchema>;

export const ArtLabPromotedPackManifestSchema = z
  .object({
    /** Stable id derived by promotion-runner from assetType + runId. */
    packId: z.string().min(1),
    /** MCP asset-kind enum (character | floor | ui-texture | icon | sprite-animation | lottie). */
    kind: z.enum(ARTLAB_ASSET_KINDS),
    /** Slot identifier — agrees with the slot registry where one exists. */
    slotId: z.string().min(1),
    /** ISO-8601 timestamp the promotion was committed to disk. */
    promotedAt: z.string().datetime({ offset: true }),
    /** Optional canon character id when the pack belongs to a character. */
    characterId: z.string().min(1).optional(),
    /** Optional canon space/floor id when the pack belongs to a floor. */
    space: z.string().min(1).optional(),
    /** Public path under public/ — what the integration consumer renders. */
    publicPath: z.string().min(1),
    /** Asset bytes with hashes; asset-pack-get re-reads each path under packDir. */
    files: z.array(ArtLabPromotedPackFileSchema).min(1),
    /**
     * RunId that produced this pack — useful for tracing back to the
     * original engine run dir.
     */
    sourceRunId: z.string().min(1),
  })
  .strict();
export type ArtLabPromotedPackManifest = z.infer<
  typeof ArtLabPromotedPackManifestSchema
>;
