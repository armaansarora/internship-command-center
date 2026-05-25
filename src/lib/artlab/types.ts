import { z } from "zod";

// Inline definition — migrated from the legacy CPE (Phase 8 Task 8.2)
export type CreativeAssetType =
  | "character"
  | "environment"
  | "prop"
  | "ui-texture"
  | "animation"
  | "scene"
  | "icon-system"
  | "marketing-hero"
  | "shader";

export const ARTLAB_PHASES = [
  "routed",
  "briefing",
  "brief-review",
  "generating-concepts",
  "concept-review",
  "refining-concepts",
  "canary",
  "production",
  "strict-qa",
  "final-review",
  "promoting",
  "verifying",
  "closed",
] as const;
export type ArtLabPhase = (typeof ARTLAB_PHASES)[number];

export const ARTLAB_BLOCKERS = [
  "needs-human",
  "budget-blocked",
  "provider-blocked",
  "repair-required",
  "style-failed",
  "upgrade-required",
  "cancelled",
] as const;
export type ArtLabBlocker = (typeof ARTLAB_BLOCKERS)[number];

export const ARTLAB_ASSET_TYPES = [
  "character",
  "environment",
  "prop",
  "ui-texture",
  "animation",
  "scene",
  "icon-system",
  "marketing-hero",
  "shader",
] as const satisfies readonly CreativeAssetType[];
export type ArtLabAssetType = (typeof ARTLAB_ASSET_TYPES)[number];

export const ArtLabApprovedConceptSchema = z
  .object({
    laneIndex: z.number().int().min(1).max(5),
    approvedAt: z.string().datetime({ offset: true }),
    approvedBy: z.literal("human"),
  })
  .strict();
export type ArtLabApprovedConcept = z.infer<typeof ArtLabApprovedConceptSchema>;

export const ArtLabRunStateSchema = z
  .object({
    runId: z.string().min(1),
    assetType: z.enum(ARTLAB_ASSET_TYPES),
    characterId: z.string().min(1).optional(),
    bundleId: z.string().min(1).optional(),
    phase: z.enum(ARTLAB_PHASES),
    blocker: z.enum(ARTLAB_BLOCKERS).optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    // Set when the current phase began. Lets /status show "elapsed 1m 50s"
    // against the per-phase ETA target instead of always rendering a generic
    // estimate. Optional so older state files still parse.
    phaseStartedAt: z.string().datetime({ offset: true }).optional(),
    request: z.string().min(1),
    approvedConcept: ArtLabApprovedConceptSchema.optional(),
    referenceImagePaths: z.array(z.string()).optional(),
    sourceSurface: z.enum(["telegram", "cli", "daemon-resume", "migration"]).optional(),
  })
  .strict();
export type ArtLabRunState = z.infer<typeof ArtLabRunStateSchema>;

export interface ArtLabWorkspacePaths {
  root: string;
  inbox: string;
  runs: string;
  memory: string;
  ledgers: string;
  slotLeases: string;
}

export const ARTLAB_WORKSPACE_RELATIVE = ".artlab/engine";
