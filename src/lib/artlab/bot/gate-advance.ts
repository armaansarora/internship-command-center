// src/lib/artlab/bot/gate-advance.ts
//
// When the Telegram user replies "approve direction N" or the canonical
// promotion phrase (REQUIRED_PROMOTION_PHRASE — see promotion/constants.ts),
// the dispatcher needs to (a) find the run waiting at the corresponding gate,
// (b) write the human-approval artifact + advance the run's phase, and
// (c) re-enqueue the run so the daemon's queue processor spawns a fresh
// worker to walk the next set of phases. This module owns that translation.
//
// The state transitions touched here (concept-review → canary,
// final-review → promoting) are the two "human" transitions in
// ARTLAB_TRANSITIONS — bot replies are the canonical surface that fires them.

import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { appendArtLabEvent } from "@/lib/artlab/state/events";
import { enqueueRun, type ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
import { appendRejection } from "@/lib/artlab/memory/rejection-ledger";
import { REQUIRED_PROMOTION_PHRASE } from "@/lib/artlab/promotion/constants";
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

/**
 * Reject a run waiting at a human gate (concept-review or final-review).
 * Sets `blocker: "cancelled"` on the run AND records a rejection ledger
 * entry so the taste signal carries forward into future runs.
 *
 * Unit 4 (2026-05-27) wires the rejection ledger — before this, the
 * Telegram reject button only sent an ack message via `bot-dispatcher`
 * with no state mutation and no learning surface.
 */
export async function rejectGate(input: {
  workspaceRoot: string;
  surface: "concept" | "final";
}): Promise<GateAdvanceResult> {
  const targetPhase: ArtLabPhase = input.surface === "concept" ? "concept-review" : "final-review";
  const runId = findLatestRunAtPhase(input.workspaceRoot, targetPhase);
  if (!runId) return { ok: false, reason: `no-run-at-${targetPhase}` };
  const runDir = join(input.workspaceRoot, "runs", runId);
  const state = readRunStateSnapshot(runDir);
  if (!state || state.phase !== targetPhase || state.blocker) {
    return { ok: false, reason: `state-not-${targetPhase}` };
  }
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, { ...state, blocker: "cancelled", updatedAt: now });
  appendArtLabEvent(runDir, {
    runId,
    at: now,
    kind: "phase-transition",
    payload: { from: state.phase, to: state.phase, blocker: "cancelled", source: "bot-reject", surface: input.surface },
  });
  // Best-effort rejection ledger write — must never break the reject flow.
  if (state.characterId) {
    try {
      const memoryDir = join(input.workspaceRoot, "memory");
      if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
      appendRejection(memoryDir, {
        at: now,
        characterId: state.characterId,
        reason: "user-rejected-run",
        codes: ["telegram-reject"],
        source: "character",
      });
    } catch {
      // ignore — observability, not control flow
    }
  }
  return { ok: true, runId, toPhase: targetPhase };
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
  writeFileSync(
    join(runDir, "approval.json"),
    JSON.stringify({ phrase: REQUIRED_PROMOTION_PHRASE }, null, 2),
  );
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
