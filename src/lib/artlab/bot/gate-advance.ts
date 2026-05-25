// src/lib/artlab/bot/gate-advance.ts
//
// When the Telegram user replies "approve direction N" or "approved for app",
// the dispatcher needs to (a) find the run waiting at the corresponding gate,
// (b) write the human-approval artifact + advance the run's phase, and
// (c) re-enqueue the run so the daemon's queue processor spawns a fresh
// worker to walk the next set of phases. This module owns that translation.
//
// The state transitions touched here (concept-review → canary,
// final-review → promoting) are the two "human" transitions in
// ARTLAB_TRANSITIONS — bot replies are the canonical surface that fires them.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { appendArtLabEvent } from "@/lib/artlab/state/events";
import { enqueueRun, type ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
import type { ArtLabPhase } from "@/lib/artlab/types";
import { writeFileSync } from "node:fs";

export interface GateAdvanceSuccess { ok: true; runId: string; toPhase: ArtLabPhase; }
export interface GateAdvanceFailure { ok: false; reason: string; }
export type GateAdvanceResult = GateAdvanceSuccess | GateAdvanceFailure;

function findLatestRunAtPhase(workspaceRoot: string, phase: ArtLabPhase): string | null {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return null;
  const candidates: Array<{ runId: string; updatedAt: string }> = [];
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    const state = readRunStateSnapshot(join(runsDir, id));
    if (!state) continue;
    if (state.phase === phase && !state.blocker) {
      candidates.push({ runId: id, updatedAt: state.updatedAt });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return candidates[0]!.runId;
}

function reEnqueueRun(workspaceRoot: string, runId: string): boolean {
  const runDir = join(workspaceRoot, "runs", runId);
  const queueEntryPath = join(runDir, "queue-entry.json");
  if (!existsSync(queueEntryPath)) return false;
  let parsed: ArtLabQueueEntry;
  try {
    parsed = JSON.parse(readFileSync(queueEntryPath, "utf8")) as ArtLabQueueEntry;
  } catch { return false; }
  const next: ArtLabQueueEntry = {
    ...parsed,
    enqueuedAt: new Date().toISOString(),
  };
  try {
    enqueueRun(workspaceRoot, next);
    return true;
  } catch {
    // Queue file may already exist if worker re-spawned concurrently — that's fine.
    return false;
  }
}

export async function advanceConceptApproval(input: {
  workspaceRoot: string;
  laneIndex: number;
}): Promise<GateAdvanceResult> {
  const runId = findLatestRunAtPhase(input.workspaceRoot, "concept-review");
  if (!runId) return { ok: false, reason: "no-run-at-concept-review" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  const state = readRunStateSnapshot(runDir);
  if (!state || state.phase !== "concept-review" || state.blocker) {
    return { ok: false, reason: "state-not-concept-review" };
  }
  if (input.laneIndex < 1 || input.laneIndex > 5) {
    return { ok: false, reason: "lane-out-of-range" };
  }
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, {
    ...state,
    phase: "canary",
    approvedConcept: { laneIndex: input.laneIndex, approvedAt: now, approvedBy: "human" },
    updatedAt: now,
  });
  appendArtLabEvent(runDir, {
    runId,
    at: now,
    kind: "phase-transition",
    payload: { from: "concept-review", to: "canary", approvedLaneIndex: input.laneIndex, source: "bot" },
  });
  reEnqueueRun(input.workspaceRoot, runId);
  return { ok: true, runId, toPhase: "canary" };
}

export async function advancePromotionApproval(input: {
  workspaceRoot: string;
}): Promise<GateAdvanceResult> {
  const runId = findLatestRunAtPhase(input.workspaceRoot, "final-review");
  if (!runId) return { ok: false, reason: "no-run-at-final-review" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  const state = readRunStateSnapshot(runDir);
  if (!state || state.phase !== "final-review" || state.blocker) {
    return { ok: false, reason: "state-not-final-review" };
  }
  // The promotion firewall requires an approval.json with the exact phrase.
  writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }, null, 2));
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, {
    ...state,
    phase: "promoting",
    updatedAt: now,
  });
  appendArtLabEvent(runDir, {
    runId,
    at: now,
    kind: "phase-transition",
    payload: { from: "final-review", to: "promoting", source: "bot" },
  });
  reEnqueueRun(input.workspaceRoot, runId);
  return { ok: true, runId, toPhase: "promoting" };
}
