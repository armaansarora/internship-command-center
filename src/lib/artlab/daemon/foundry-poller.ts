// src/lib/artlab/daemon/foundry-poller.ts
//
// Daemon-side bridge for the Foundry MCP server.
//
// The MCP `foundry/generate` handler writes a job file to
// `.artlab/engine/inbox/foundry/generate-<runId>.json` and returns a runId
// immediately. Before this poller existed, nothing read those files — the
// advertised contract (agent calls `generate` → daemon renders → poll
// `generate_status` for promotion) was dead.
//
// This poller closes the loop:
//   1. Drain every `generate-*.json` from the foundry inbox.
//   2. Validate each via FoundryGenerateJobSchema (z.strict — no silent drift).
//   3. Atomically write `runs/<runId>/run-state.json` with phase=routed so
//      `foundry/generate_status` flips from `queued` → `running` the moment
//      the daemon picks the job up.
//   4. Enqueue the run via the existing `enqueueRun` so the queue processor
//      can spawn a worker — no parallel queue logic, no second runner.
//   5. Move the inbox file into `inbox/foundry/.processed/<runId>.json` so the
//      operator can still inspect what landed without re-processing.
//
// Errors per-file are recorded via `recordDaemonError` (no silent catches);
// poisoned files are moved into `inbox/foundry/.bad/<ts>-<name>` so the
// poller doesn't trip over them on the next tick.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { enqueueRun, ArtLabQueueEntrySchema, type ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
import { writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { recordDaemonError } from "./entry";
import {
  ARTLAB_ASSET_TYPES,
  type ArtLabAssetType,
  type ArtLabRunState,
} from "@/lib/artlab/types";

/**
 * Shape of a job written by `handleFoundryGenerate` into the foundry inbox.
 * Mirrors the MCP `FoundryGenerateInputSchema` plus the bookkeeping fields
 * the handler injects (runId, queuedAt, source, optional brainHint).
 */
export const FoundryGenerateJobSchema = z
  .object({
    runId: z
      .string()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        "must be a UUID v4",
      ),
    queuedAt: z.string().datetime({ offset: true }),
    source: z.literal("foundry-mcp"),
    kind: z.enum(["character", "floor", "ui-texture", "icon", "sprite-animation", "lottie"]),
    description: z.string().min(8),
    referenceImageUrl: z.string().url().optional(),
    anchorPackId: z.string().min(1).optional(),
    priority: z.enum(["low", "normal", "high"]).optional(),
    requesterAgent: z.string().min(1).optional(),
    brainHintStatus: z.enum(["pending", "ready", "failed"]).optional(),
    brainHint: z.record(z.string(), z.unknown()).optional(),
    brainHintError: z.string().optional(),
    brainHintCompletedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export type FoundryGenerateJob = z.infer<typeof FoundryGenerateJobSchema>;

/**
 * Map the FoundryAssetKind taxonomy onto the ArtLab `ArtLabAssetType` enum.
 * ArtLabRunStateSchema enforces this enum, so an incoming `kind` must always
 * resolve to a valid `assetType` — we never emit a state file that fails the
 * canonical schema.
 */
const KIND_TO_ASSET_TYPE: Readonly<Record<FoundryGenerateJob["kind"], ArtLabAssetType>> = {
  character: "character",
  floor: "environment",
  "ui-texture": "ui-texture",
  icon: "icon-system",
  "sprite-animation": "animation",
  lottie: "animation",
};

/**
 * Map the MCP `priority` enum (low/normal/high) onto the ArtLab queue
 * priority enum (human-flagged/scheduled/default). Foundry callers expressing
 * `high` urgency surface as `human-flagged` so the queue processor pulls
 * them first; everything else stays at `default`.
 */
function mapPriority(p: FoundryGenerateJob["priority"]): ArtLabQueueEntry["priority"] {
  if (p === "high") return "human-flagged";
  return "default";
}

export interface FoundryPollerInput {
  workspaceRoot: string;
  now?: () => Date;
}

export interface FoundryPollerResult {
  enqueuedRunIds: string[];
  failedFiles: string[];
}

export interface FoundryPoller {
  tick(): Promise<FoundryPollerResult>;
}

function foundryInboxDir(workspaceRoot: string): string {
  return join(workspaceRoot, "inbox", "foundry");
}

function processedDir(workspaceRoot: string): string {
  return join(foundryInboxDir(workspaceRoot), ".processed");
}

function badDir(workspaceRoot: string): string {
  return join(foundryInboxDir(workspaceRoot), ".bad");
}

/**
 * Move a file via rename (atomic on the same filesystem). The poller is the
 * only writer of its inbox, so we never race against the MCP server for the
 * same filename — the MCP server uses unique runId-derived names.
 */
function moveFile(src: string, dst: string): void {
  renameSync(src, dst);
}

/**
 * Quarantine a poisoned inbox file so the poller doesn't keep tripping over
 * it. We never throw from the poller's main loop — `recordDaemonError`
 * already captured the parse failure.
 */
function quarantine(workspaceRoot: string, srcPath: string, filename: string): void {
  try {
    const dst = badDir(workspaceRoot);
    if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
    moveFile(srcPath, join(dst, `${Date.now()}-${filename}`));
  } catch (err) {
    recordDaemonError(workspaceRoot, "foundry-poller:quarantine", err);
  }
}

/**
 * Translate a validated Foundry job into the canonical ArtLab run state
 * shape and atomically persist it under `runs/<runId>/run-state.json`. The
 * canonical `writeRunStateSnapshot` runs `ArtLabRunStateSchema.parse` so a
 * mapping bug fails loudly here rather than silently writing a corrupt
 * state file the worker will choke on later.
 */
function seedRunState(
  workspaceRoot: string,
  job: FoundryGenerateJob,
  now: () => Date,
): void {
  const runDir = join(workspaceRoot, "runs", job.runId);
  if (!existsSync(runDir)) mkdirSync(runDir, { recursive: true });
  const assetType = KIND_TO_ASSET_TYPE[job.kind];
  // Belt-and-braces: ARTLAB_ASSET_TYPES guards the canonical enum even if
  // KIND_TO_ASSET_TYPE ever loses sync with ArtLabAssetType.
  if (!ARTLAB_ASSET_TYPES.includes(assetType)) {
    throw new Error(`foundry-poller: kind=${job.kind} mapped to unknown assetType=${assetType}`);
  }
  const createdAt = now().toISOString();
  const state: ArtLabRunState = {
    runId: job.runId,
    assetType,
    phase: "routed",
    createdAt,
    updatedAt: createdAt,
    request: job.description,
    sourceSurface: "cli",
  };
  writeRunStateSnapshot(runDir, state);
}

/**
 * Enqueue the run through the same queue API the CLI bridge uses. The queue
 * processor pulls the next entry on the very next daemon tick and the
 * run-worker takes over from there.
 */
function enqueueFoundryRun(
  workspaceRoot: string,
  job: FoundryGenerateJob,
  now: () => Date,
): void {
  const entry: ArtLabQueueEntry = ArtLabQueueEntrySchema.parse({
    runId: job.runId,
    priority: mapPriority(job.priority),
    enqueuedAt: now().toISOString(),
    spec: {
      sourceSurface: "foundry-mcp",
      intent: "foundry-generate",
      kind: job.kind,
      request: job.description,
      requesterAgent: job.requesterAgent ?? null,
      referenceImageUrl: job.referenceImageUrl ?? null,
      anchorPackId: job.anchorPackId ?? null,
      brainHintStatus: job.brainHintStatus ?? null,
      brainHint: job.brainHint ?? null,
    },
  });
  enqueueRun(workspaceRoot, entry);
}

/**
 * Process a single inbox file:
 *   parse → seed run-state → enqueue → archive into .processed.
 *
 * Any step that throws causes the file to be quarantined into .bad and an
 * error recorded via `recordDaemonError`. We never delete a malformed file
 * outright so the operator can still inspect what landed.
 */
function processOne(
  workspaceRoot: string,
  filename: string,
  now: () => Date,
): { runId: string | null; error: unknown | null } {
  const srcPath = join(foundryInboxDir(workspaceRoot), filename);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(srcPath, "utf8"));
  } catch (err) {
    recordDaemonError(workspaceRoot, "foundry-poller:parse", err);
    quarantine(workspaceRoot, srcPath, filename);
    return { runId: null, error: err };
  }
  let job: FoundryGenerateJob;
  try {
    job = FoundryGenerateJobSchema.parse(raw);
  } catch (err) {
    recordDaemonError(workspaceRoot, "foundry-poller:schema", err);
    quarantine(workspaceRoot, srcPath, filename);
    return { runId: null, error: err };
  }
  try {
    seedRunState(workspaceRoot, job, now);
    enqueueFoundryRun(workspaceRoot, job, now);
    const archive = processedDir(workspaceRoot);
    if (!existsSync(archive)) mkdirSync(archive, { recursive: true });
    moveFile(srcPath, join(archive, `${job.runId}.json`));
    return { runId: job.runId, error: null };
  } catch (err) {
    recordDaemonError(workspaceRoot, "foundry-poller:submit", err);
    // Submit failure (e.g. queue conflict): leave the inbox file in place so
    // the next tick retries. The state file may have been written; the queue
    // entry uses `wx` so a retry will collide if the queue file already
    // landed — caller can inspect daemon-errors.jsonl.
    return { runId: null, error: err };
  }
}

export function createFoundryPoller(input: FoundryPollerInput): FoundryPoller {
  const now = input.now ?? (() => new Date());
  return {
    async tick(): Promise<FoundryPollerResult> {
      const dir = foundryInboxDir(input.workspaceRoot);
      if (!existsSync(dir)) {
        // Lazy-create so the foundry MCP server can drop its first file in.
        mkdirSync(dir, { recursive: true });
        return { enqueuedRunIds: [], failedFiles: [] };
      }
      // Atomically written `<path>.tmp.<pid>.<ts>` files are visible during
      // `readdirSync` — skip them so we never half-read a partial payload.
      const filenames = readdirSync(dir)
        .filter((f) => f.startsWith("generate-") && f.endsWith(".json") && !f.includes(".tmp."))
        .sort();
      const enqueuedRunIds: string[] = [];
      const failedFiles: string[] = [];
      for (const filename of filenames) {
        const result = processOne(input.workspaceRoot, filename, now);
        if (result.runId) enqueuedRunIds.push(result.runId);
        else failedFiles.push(filename);
      }
      return { enqueuedRunIds, failedFiles };
    },
  };
}
