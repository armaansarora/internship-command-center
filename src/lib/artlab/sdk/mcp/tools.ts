import { z } from "zod";
import { PackIdSchema } from "./lib/path-safety";

/**
 * Maximum length of a `artlab/generate` `description`. Caps the largest
 * single MCP payload so a single call cannot enqueue megabytes of prompt
 * text (cheap DoS surface). 4000 chars comfortably fits a rich character
 * brief; honest prompts in production sit well under 1500.
 */
export const ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS = 4000;

/**
 * Allow-list of hostnames whose images may be passed as `referenceImageUrl`
 * to `artlab/generate`. Anything off this list is rejected as a potential
 * SSRF vector — the daemon eventually fetches this URL server-side, so an
 * unrestricted accept lets a caller probe internal endpoints
 * (169.254.169.254 cloud metadata, 127.0.0.1 admin panels, etc.).
 *
 * Production additions land here, not in ad-hoc bypasses inside handlers.
 */
export const ARTLAB_GENERATE_REFERENCE_IMAGE_HOST_ALLOWLIST = [
  // Supabase public storage — production-pinned art and CMS-driven references.
  "jzrsrruugcajohvvmevg.supabase.co",
  // GitHub raw user content — design system references checked into git.
  "raw.githubusercontent.com",
  // The Tower production domain — when a reference is itself hosted on us.
  "interntower.com",
  "www.interntower.com",
] as const;

/**
 * Hosts the referenceImageUrl validator must reject outright, independent of
 * the allow-list. These cover SSRF-target ranges that should never reach a
 * fetch from inside Vercel/local dev (cloud metadata, loopback, RFC1918).
 */
const SSRF_FORBIDDEN_HOSTNAMES = new Set<string>([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "metadata.google.internal",
]);

/** RFC1918 + link-local + loopback IPv4 ranges. */
function isPrivateOrLoopbackIPv4(hostname: string): boolean {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [, a, b] = m.map(Number);
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 — link-local (covers AWS IMDS at 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 — "this network"
  if (a === 0) return true;
  return false;
}

/**
 * Reference-image URL validator: HTTPS-only, host on the explicit allow-list,
 * never an SSRF-prone target. Returns the original URL string on success.
 */
const ReferenceImageUrlSchema = z
  .string()
  .url("referenceImageUrl must be a valid URL")
  .refine((raw) => {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return false;
    }
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (SSRF_FORBIDDEN_HOSTNAMES.has(host)) return false;
    if (isPrivateOrLoopbackIPv4(host)) return false;
    return (ARTLAB_GENERATE_REFERENCE_IMAGE_HOST_ALLOWLIST as readonly string[]).includes(host);
  }, "referenceImageUrl must be HTTPS and on the ArtLab host allow-list");

/**
 * Canonical, ordered list of every MCP tool exposed by the
 * ArtLab SDK server. Order matters because the MCP
 * manifest emits them in this order to the client.
 */
export const ARTLAB_MCP_TOOL_NAMES = [
  "artlab/canon_list",
  "artlab/canon_get",
  "artlab/asset_pack_list",
  "artlab/asset_pack_get",
  "artlab/asset_pack_integration",
  "artlab/slot_audit",
  "artlab/generate",
  "artlab/generate_status",
  "artlab/diagnostics",
] as const;
export type ArtLabMcpToolName = (typeof ARTLAB_MCP_TOOL_NAMES)[number];

export const ARTLAB_CANON_KINDS = ["character", "floor", "palette", "style-envelope"] as const;
export type ArtLabCanonKind = (typeof ARTLAB_CANON_KINDS)[number];

export const ARTLAB_ASSET_KINDS = [
  "character",
  "floor",
  "ui-texture",
  "icon",
  "sprite-animation",
  "lottie",
] as const;
export type ArtLabAssetKind = (typeof ARTLAB_ASSET_KINDS)[number];

export const ARTLAB_RUN_STATUSES = [
  "queued",
  "running",
  "blocked",
  "promoted",
  "cancelled",
  "failed",
] as const;
export type ArtLabRunStatus = (typeof ARTLAB_RUN_STATUSES)[number];

const UuidV4 = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "must be a UUID v4",
  );

// ---- canon_list ----------------------------------------------------------
export const ArtLabCanonListInputSchema = z
  .object({
    kind: z.enum(ARTLAB_CANON_KINDS).optional(),
  })
  .strict();
export type ArtLabCanonListInput = z.infer<typeof ArtLabCanonListInputSchema>;

export const ArtLabCanonListOutputSchema = z
  .object({
    entries: z.array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(ARTLAB_CANON_KINDS),
        displayName: z.string().min(1),
        summary: z.string().min(1),
      }).strict(),
    ),
  })
  .strict();
export type ArtLabCanonListOutput = z.infer<typeof ArtLabCanonListOutputSchema>;

// ---- canon_get -----------------------------------------------------------
export const ArtLabCanonGetInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type ArtLabCanonGetInput = z.infer<typeof ArtLabCanonGetInputSchema>;

export const ArtLabCanonGetOutputSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(ARTLAB_CANON_KINDS),
    yamlAsJson: z.record(z.string(), z.unknown()),
    sourcePath: z.string().min(1),
  })
  .strict();
export type ArtLabCanonGetOutput = z.infer<typeof ArtLabCanonGetOutputSchema>;

// ---- asset_pack_list -----------------------------------------------------
export const ArtLabAssetPackListInputSchema = z
  .object({
    kind: z.enum(ARTLAB_ASSET_KINDS).optional(),
    characterId: z.string().min(1).optional(),
    space: z.string().min(1).optional(),
  })
  .strict();
export type ArtLabAssetPackListInput = z.infer<typeof ArtLabAssetPackListInputSchema>;

export const ArtLabAssetPackListOutputSchema = z
  .object({
    packs: z.array(
      z.object({
        packId: z.string().min(1),
        kind: z.enum(ARTLAB_ASSET_KINDS),
        slotId: z.string().min(1),
        promotedAt: z.string().datetime({ offset: true }),
        characterId: z.string().min(1).optional(),
        space: z.string().min(1).optional(),
      }).strict(),
    ),
  })
  .strict();
export type ArtLabAssetPackListOutput = z.infer<typeof ArtLabAssetPackListOutputSchema>;

// ---- asset_pack_get ------------------------------------------------------
export const ArtLabAssetPackGetInputSchema = z
  .object({ packId: z.string().min(1) })
  .strict();
export type ArtLabAssetPackGetInput = z.infer<typeof ArtLabAssetPackGetInputSchema>;

export const ArtLabAssetPackGetOutputSchema = z
  .object({
    packId: z.string().min(1),
    manifest: z.record(z.string(), z.unknown()),
    files: z.array(
      z.object({
        path: z.string().min(1),
        role: z.string().min(1),
        bytes: z.number().int().min(0),
      }).strict(),
    ),
  })
  .strict();
export type ArtLabAssetPackGetOutput = z.infer<typeof ArtLabAssetPackGetOutputSchema>;

// ---- asset_pack_integration ---------------------------------------------
export const ArtLabAssetPackIntegrationInputSchema = z
  .object({
    packId: z.string().min(1),
    targetFramework: z
      .enum(["next-app-router", "next-pages", "react", "raw"])
      .default("next-app-router"),
  })
  .strict();
export type ArtLabAssetPackIntegrationInput = z.infer<
  typeof ArtLabAssetPackIntegrationInputSchema
>;

export const ArtLabAssetPackIntegrationOutputSchema = z
  .object({
    packId: z.string().min(1),
    importStatement: z.string().min(1),
    snippet: z.string().min(1),
    notes: z.array(z.string()).optional(),
  })
  .strict();
export type ArtLabAssetPackIntegrationOutput = z.infer<
  typeof ArtLabAssetPackIntegrationOutputSchema
>;

// ---- slot_audit ----------------------------------------------------------
export const ArtLabSlotAuditInputSchema = z
  .object({
    kind: z.enum(ARTLAB_ASSET_KINDS).optional(),
    space: z.string().min(1).optional(),
  })
  .strict();
export type ArtLabSlotAuditInput = z.infer<typeof ArtLabSlotAuditInputSchema>;

export const ArtLabSlotAuditOutputSchema = z
  .object({
    missing: z.array(
      z.object({
        slotId: z.string().min(1),
        kind: z.enum(ARTLAB_ASSET_KINDS),
        space: z.string().min(1).optional(),
        characterId: z.string().min(1).optional(),
        description: z.string().min(1),
      }).strict(),
    ),
    coveredCount: z.number().int().min(0),
    totalCount: z.number().int().min(0),
  })
  .strict();
export type ArtLabSlotAuditOutput = z.infer<typeof ArtLabSlotAuditOutputSchema>;

// ---- generate ------------------------------------------------------------

/**
 * characterId for `artlab/generate`. Accepts either canon `header.id`
 * (e.g. "sol-navarro") or legacy roleSlug (e.g. "cno") — the sdk-poller
 * routes both forms through the intake router so the run-state seeded for
 * the worker always carries the canonical header.id. Charset is the same
 * kebab-case shape used by canon header IDs and roleSlugs, length-capped
 * so a malformed MCP call can't enqueue a megabyte string.
 */
export const ArtLabGenerateCharacterIdSchema = z
  .string()
  .min(2, "characterId must be at least 2 chars")
  .max(64, "characterId must be 64 chars or fewer")
  .regex(/^[a-z][a-z0-9-]*$/, "characterId must be lowercase kebab-case");

export const ArtLabGenerateInputSchema = z
  .object({
    kind: z.enum(ARTLAB_ASSET_KINDS),
    // Capped at ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS (~4000) to prevent a
    // single MCP call from enqueuing megabytes of prompt text.
    description: z
      .string()
      .min(8, "description must be at least 8 chars")
      .max(
        ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS,
        `description must be ${ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS} chars or fewer`,
      ),
    // HTTPS-only + host allow-list to close the SSRF surface — see
    // ReferenceImageUrlSchema and ARTLAB_GENERATE_REFERENCE_IMAGE_HOST_ALLOWLIST.
    referenceImageUrl: ReferenceImageUrlSchema.optional(),
    // anchorPackId flows into path.join(packsRoot, …) inside asset_pack
    // handlers, so it must use the same strict PackIdSchema (charset,
    // length cap, encoded-traversal rejection) as those tools — not a
    // plain z.string().min(1) which would let `../../../etc/passwd` through.
    anchorPackId: PackIdSchema.optional(),
    // Explicit character identity (canon header.id or legacy roleSlug).
    // When present, the daemon writes it straight to run-state without
    // re-routing the description; absent, the daemon routes the
    // description through the intake router as a natural-language fallback.
    characterId: ArtLabGenerateCharacterIdSchema.optional(),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    requesterAgent: z.string().min(1).optional(),
  })
  .strict();
export type ArtLabGenerateInput = z.infer<typeof ArtLabGenerateInputSchema>;

export const ArtLabGenerateOutputSchema = z
  .object({
    runId: UuidV4,
    status: z.enum(ARTLAB_RUN_STATUSES),
    queuedAt: z.string().datetime({ offset: true }).optional(),
    inboxPath: z.string().min(1).optional(),
  })
  .strict();
export type ArtLabGenerateOutput = z.infer<typeof ArtLabGenerateOutputSchema>;

// ---- generate_status -----------------------------------------------------
export const ArtLabGenerateStatusInputSchema = z
  .object({ runId: UuidV4 })
  .strict();
export type ArtLabGenerateStatusInput = z.infer<typeof ArtLabGenerateStatusInputSchema>;

export const ArtLabGenerateStatusOutputSchema = z
  .object({
    runId: UuidV4,
    status: z.enum(ARTLAB_RUN_STATUSES),
    phase: z.string().min(1),
    percentComplete: z.number().min(0).max(100),
    blockers: z.array(z.string()),
    etaSeconds: z.number().int().min(0).optional(),
    promotedPackId: z.string().min(1).optional(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ArtLabGenerateStatusOutput = z.infer<typeof ArtLabGenerateStatusOutputSchema>;

// ---- diagnostics ---------------------------------------------------------
export const ArtLabDiagnosticsInputSchema = z.object({}).strict();
export type ArtLabDiagnosticsInput = z.infer<typeof ArtLabDiagnosticsInputSchema>;

export const ArtLabDiagnosticsOutputSchema = z
  .object({
    daemonUp: z.boolean(),
    providersReachable: z.record(z.string(), z.boolean()),
    recentRuns: z
      .array(
        z.object({
          runId: UuidV4,
          status: z.enum(ARTLAB_RUN_STATUSES),
          updatedAt: z.string().datetime({ offset: true }),
        }).strict(),
      )
      .max(5),
    backlogDepth: z.number().int().min(0),
    collectedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ArtLabDiagnosticsOutput = z.infer<typeof ArtLabDiagnosticsOutputSchema>;

/**
 * Compact registry record used by `server.ts` when calling
 * `server.tool(name, schema, handler)`.
 */
export interface ArtLabMcpToolDef<I, O> {
  name: ArtLabMcpToolName;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
}
