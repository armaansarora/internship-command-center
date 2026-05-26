import { z } from "zod";

/**
 * Canonical, ordered list of every MCP tool exposed by the
 * Tower Art Foundry server. Order matters because the MCP
 * manifest emits them in this order to the client.
 */
export const FOUNDRY_MCP_TOOL_NAMES = [
  "foundry/canon_list",
  "foundry/canon_get",
  "foundry/asset_pack_list",
  "foundry/asset_pack_get",
  "foundry/asset_pack_integration",
  "foundry/slot_audit",
  "foundry/generate",
  "foundry/generate_status",
  "foundry/diagnostics",
] as const;
export type FoundryMcpToolName = (typeof FOUNDRY_MCP_TOOL_NAMES)[number];

export const FOUNDRY_CANON_KINDS = ["character", "floor", "palette", "style-envelope"] as const;
export type FoundryCanonKind = (typeof FOUNDRY_CANON_KINDS)[number];

export const FOUNDRY_ASSET_KINDS = [
  "character",
  "floor",
  "ui-texture",
  "icon",
  "sprite-animation",
  "lottie",
] as const;
export type FoundryAssetKind = (typeof FOUNDRY_ASSET_KINDS)[number];

export const FOUNDRY_RUN_STATUSES = [
  "queued",
  "running",
  "blocked",
  "promoted",
  "cancelled",
  "failed",
] as const;
export type FoundryRunStatus = (typeof FOUNDRY_RUN_STATUSES)[number];

const UuidV4 = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "must be a UUID v4",
  );

// ---- canon_list ----------------------------------------------------------
export const FoundryCanonListInputSchema = z
  .object({
    kind: z.enum(FOUNDRY_CANON_KINDS).optional(),
  })
  .strict();
export type FoundryCanonListInput = z.infer<typeof FoundryCanonListInputSchema>;

export const FoundryCanonListOutputSchema = z
  .object({
    entries: z.array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(FOUNDRY_CANON_KINDS),
        displayName: z.string().min(1),
        summary: z.string().min(1),
      }).strict(),
    ),
  })
  .strict();
export type FoundryCanonListOutput = z.infer<typeof FoundryCanonListOutputSchema>;

// ---- canon_get -----------------------------------------------------------
export const FoundryCanonGetInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type FoundryCanonGetInput = z.infer<typeof FoundryCanonGetInputSchema>;

export const FoundryCanonGetOutputSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(FOUNDRY_CANON_KINDS),
    yamlAsJson: z.record(z.string(), z.unknown()),
    sourcePath: z.string().min(1),
  })
  .strict();
export type FoundryCanonGetOutput = z.infer<typeof FoundryCanonGetOutputSchema>;

// ---- asset_pack_list -----------------------------------------------------
export const FoundryAssetPackListInputSchema = z
  .object({
    kind: z.enum(FOUNDRY_ASSET_KINDS).optional(),
    characterId: z.string().min(1).optional(),
    space: z.string().min(1).optional(),
  })
  .strict();
export type FoundryAssetPackListInput = z.infer<typeof FoundryAssetPackListInputSchema>;

export const FoundryAssetPackListOutputSchema = z
  .object({
    packs: z.array(
      z.object({
        packId: z.string().min(1),
        kind: z.enum(FOUNDRY_ASSET_KINDS),
        slotId: z.string().min(1),
        promotedAt: z.string().datetime({ offset: true }),
        characterId: z.string().min(1).optional(),
        space: z.string().min(1).optional(),
      }).strict(),
    ),
  })
  .strict();
export type FoundryAssetPackListOutput = z.infer<typeof FoundryAssetPackListOutputSchema>;

// ---- asset_pack_get ------------------------------------------------------
export const FoundryAssetPackGetInputSchema = z
  .object({ packId: z.string().min(1) })
  .strict();
export type FoundryAssetPackGetInput = z.infer<typeof FoundryAssetPackGetInputSchema>;

export const FoundryAssetPackGetOutputSchema = z
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
export type FoundryAssetPackGetOutput = z.infer<typeof FoundryAssetPackGetOutputSchema>;

// ---- asset_pack_integration ---------------------------------------------
export const FoundryAssetPackIntegrationInputSchema = z
  .object({
    packId: z.string().min(1),
    targetFramework: z
      .enum(["next-app-router", "next-pages", "react", "raw"])
      .default("next-app-router"),
  })
  .strict();
export type FoundryAssetPackIntegrationInput = z.infer<
  typeof FoundryAssetPackIntegrationInputSchema
>;

export const FoundryAssetPackIntegrationOutputSchema = z
  .object({
    packId: z.string().min(1),
    importStatement: z.string().min(1),
    snippet: z.string().min(1),
    notes: z.array(z.string()).optional(),
  })
  .strict();
export type FoundryAssetPackIntegrationOutput = z.infer<
  typeof FoundryAssetPackIntegrationOutputSchema
>;

// ---- slot_audit ----------------------------------------------------------
export const FoundrySlotAuditInputSchema = z
  .object({
    kind: z.enum(FOUNDRY_ASSET_KINDS).optional(),
    space: z.string().min(1).optional(),
  })
  .strict();
export type FoundrySlotAuditInput = z.infer<typeof FoundrySlotAuditInputSchema>;

export const FoundrySlotAuditOutputSchema = z
  .object({
    missing: z.array(
      z.object({
        slotId: z.string().min(1),
        kind: z.enum(FOUNDRY_ASSET_KINDS),
        space: z.string().min(1).optional(),
        characterId: z.string().min(1).optional(),
        description: z.string().min(1),
      }).strict(),
    ),
    coveredCount: z.number().int().min(0),
    totalCount: z.number().int().min(0),
  })
  .strict();
export type FoundrySlotAuditOutput = z.infer<typeof FoundrySlotAuditOutputSchema>;

// ---- generate ------------------------------------------------------------
export const FoundryGenerateInputSchema = z
  .object({
    kind: z.enum(FOUNDRY_ASSET_KINDS),
    description: z.string().min(8),
    referenceImageUrl: z.string().url().optional(),
    anchorPackId: z.string().min(1).optional(),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    requesterAgent: z.string().min(1).optional(),
  })
  .strict();
export type FoundryGenerateInput = z.infer<typeof FoundryGenerateInputSchema>;

export const FoundryGenerateOutputSchema = z
  .object({
    runId: UuidV4,
    status: z.enum(FOUNDRY_RUN_STATUSES),
    queuedAt: z.string().datetime({ offset: true }).optional(),
    inboxPath: z.string().min(1).optional(),
  })
  .strict();
export type FoundryGenerateOutput = z.infer<typeof FoundryGenerateOutputSchema>;

// ---- generate_status -----------------------------------------------------
export const FoundryGenerateStatusInputSchema = z
  .object({ runId: UuidV4 })
  .strict();
export type FoundryGenerateStatusInput = z.infer<typeof FoundryGenerateStatusInputSchema>;

export const FoundryGenerateStatusOutputSchema = z
  .object({
    runId: UuidV4,
    status: z.enum(FOUNDRY_RUN_STATUSES),
    phase: z.string().min(1),
    percentComplete: z.number().min(0).max(100),
    blockers: z.array(z.string()),
    etaSeconds: z.number().int().min(0).optional(),
    promotedPackId: z.string().min(1).optional(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type FoundryGenerateStatusOutput = z.infer<typeof FoundryGenerateStatusOutputSchema>;

// ---- diagnostics ---------------------------------------------------------
export const FoundryDiagnosticsInputSchema = z.object({}).strict();
export type FoundryDiagnosticsInput = z.infer<typeof FoundryDiagnosticsInputSchema>;

export const FoundryDiagnosticsOutputSchema = z
  .object({
    daemonUp: z.boolean(),
    providersReachable: z.record(z.string(), z.boolean()),
    recentRuns: z
      .array(
        z.object({
          runId: UuidV4,
          status: z.enum(FOUNDRY_RUN_STATUSES),
          updatedAt: z.string().datetime({ offset: true }),
        }).strict(),
      )
      .max(5),
    backlogDepth: z.number().int().min(0),
    collectedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type FoundryDiagnosticsOutput = z.infer<typeof FoundryDiagnosticsOutputSchema>;

/**
 * Compact registry record used by `server.ts` when calling
 * `server.tool(name, schema, handler)`.
 */
export interface FoundryMcpToolDef<I, O> {
  name: FoundryMcpToolName;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
}
