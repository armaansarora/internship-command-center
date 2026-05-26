import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { ArtLabRunStateSchema, type ArtLabRunState, ARTLAB_PHASES } from "../types";

export const ArtLabProgressSnapshotSchema = z
  .object({
    runId: z.string().min(1),
    at: z.string().datetime({ offset: true }),
    phase: z.enum(ARTLAB_PHASES),
    slotsCompleted: z.number().int().min(0),
    slotsRunning: z.number().int().min(0),
    slotsFailed: z.number().int().min(0),
    actualSpendCents: z.number().int().min(0),
    reservedCents: z.number().int().min(0),
  })
  .strict();
export type ArtLabProgressSnapshot = z.infer<typeof ArtLabProgressSnapshotSchema>;

function atomicWrite(targetPath: string, content: string): void {
  const dir = dirname(targetPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, content, { encoding: "utf8" });
  renameSync(tmp, targetPath);
}

export function writeRunStateSnapshot(runDir: string, state: ArtLabRunState): void {
  const parsed = ArtLabRunStateSchema.parse(state);
  atomicWrite(join(runDir, "run-state.json"), `${JSON.stringify(parsed, null, 2)}\n`);
}

export function readRunStateSnapshot(runDir: string): ArtLabRunState | null {
  const path = join(runDir, "run-state.json");
  if (!existsSync(path)) return null;
  return ArtLabRunStateSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function writeProgressSnapshot(runDir: string, progress: ArtLabProgressSnapshot): void {
  const parsed = ArtLabProgressSnapshotSchema.parse(progress);
  atomicWrite(join(runDir, "progress.json"), `${JSON.stringify(parsed, null, 2)}\n`);
}

export function readProgressSnapshot(runDir: string): ArtLabProgressSnapshot | null {
  const path = join(runDir, "progress.json");
  if (!existsSync(path)) return null;
  return ArtLabProgressSnapshotSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export interface BrainHintMerge {
  status: "ready" | "failed";
  hint?: Record<string, unknown>;
  error?: string;
  completedAt: string;
}

/**
 * Merge a brain-enrichment result into an existing `runs/<runId>/run-state.json`.
 *
 * Used by the Foundry MCP `generate` handler's sidecar emitter when the
 * poller archived the trigger file BEFORE brain enrichment resolved (slow
 * LLM vs fast drain). The merge updates the canonical run-state so the
 * run-worker and `generate_status` can read the brain hint just as if the
 * sidecar had reached the queue spec via the normal poller path.
 *
 * Returns `true` when the merge landed; `false` when no run-state exists
 * yet (the poller hasn't seeded it). The caller can fall back to writing
 * a `.processed/` sidecar for audit/recovery.
 *
 * `updatedAt` is bumped so consumers using mtime-style polling see motion.
 * The merge is atomic (temp+rename) and schema-validated via
 * `writeRunStateSnapshot` so a malformed merge fails loudly instead of
 * silently corrupting state.
 */
export function mergeBrainHintIntoRunState(
  runDir: string,
  merge: BrainHintMerge,
): boolean {
  const existing = readRunStateSnapshot(runDir);
  if (!existing) return false;
  const next: ArtLabRunState = {
    ...existing,
    brainHintStatus: merge.status,
    brainHint: merge.hint,
    brainHintError: merge.error,
    brainHintCompletedAt: merge.completedAt,
    updatedAt: new Date().toISOString(),
  };
  writeRunStateSnapshot(runDir, next);
  return true;
}
