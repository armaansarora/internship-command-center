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
  "concept-critique-fallback",
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
    // `artlab-mcp` is the surface used by the ArtLab SDK MCP server (the
    // `artlab/generate` tool). Before this entry existed, `sdk-poller.ts`
    // wrote `"cli"` for MCP-origin jobs — a schema lie that confused
    // operators reading run-state to find out who started a run.
    sourceSurface: z.enum(["telegram", "cli", "artlab-mcp", "daemon-resume", "migration"]).optional(),
    // Populated by `promotionRunner` once a run successfully promotes
    // assets into `public/art/`. The ArtLab `generate_status` MCP handler
    // surfaces this value to callers so agents can immediately follow up
    // with `asset_pack_integration` instead of polling indefinitely.
    // Derived as `${assetType}-${runId.slice(0,8)}` — stable across replays
    // and human-recognisable in logs.
    promotedPackId: z.string().min(1).optional(),
    // Brain enrichment hint produced by the ArtLab MCP `generate` handler.
    // Normally the hint lands on the queue spec via the sdk-poller's
    // sidecar merge. If the poller archives the trigger file BEFORE
    // enrichment resolves (slow LLM vs fast drain), the sidecar emitter
    // merges the hint directly here so the run-worker and `generate_status`
    // still see it. Optional — runs without a brainEnrich callback never
    // populate these fields. See `src/lib/artlab/sdk/mcp/tool-handlers/generate.ts`.
    brainHintStatus: z.enum(["pending", "ready", "failed"]).optional(),
    brainHint: z.record(z.string(), z.unknown()).optional(),
    brainHintError: z.string().optional(),
    brainHintCompletedAt: z.string().datetime({ offset: true }).optional(),
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
