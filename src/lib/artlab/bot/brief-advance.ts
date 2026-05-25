// src/lib/artlab/bot/brief-advance.ts
//
// Brief-review gate helpers: approve the brief (→ generating-concepts) or
// record an adjustment (→ briefing with a new iteration).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { appendArtLabEvent } from "@/lib/artlab/state/events";
import { enqueueRun, type ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
import {
  appendBriefAdjustment,
  type BriefAdjustmentEntry,
} from "@/lib/artlab/brainstorm/feedback-ledger";

export interface BriefGateSuccess { ok: true; runId: string; }
export interface BriefGateFailure { ok: false; reason: string; }
export type BriefGateResult = BriefGateSuccess | BriefGateFailure;

function findLatestRunAtBriefReview(workspaceRoot: string): string | null {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return null;
const candidates: Array<{ runId: string; updatedAt: string }> = [];
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    const state = readRunStateSnapshot(join(runsDir, id));
    if (!state || state.blocker) continue;
    if (state.phase === "brief-review") candidates.push({ runId: id, updatedAt: state.updatedAt });
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
  try { parsed = JSON.parse(readFileSync(queueEntryPath, "utf8")) as ArtLabQueueEntry; }
  catch { return false; }
  try {
    enqueueRun(workspaceRoot, { ...parsed, enqueuedAt: new Date().toISOString() });
    return true;
  } catch { return false; }
}

export async function approveBrief(input: { workspaceRoot: string; runId?: string }): Promise<BriefGateResult> {
  const runId = input.runId ?? findLatestRunAtBriefReview(input.workspaceRoot);
  if (!runId) return { ok: false, reason: "no-run-at-brief-review" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  const state = readRunStateSnapshot(runDir);
  if (!state || state.phase !== "brief-review" || state.blocker) {
    return { ok: false, reason: "state-not-brief-review" };
  }
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, { ...state, phase: "generating-concepts", updatedAt: now });
  appendArtLabEvent(runDir, {
    runId,
    at: now,
    kind: "phase-transition",
    payload: { from: "brief-review", to: "generating-concepts", source: "bot" },
  });
  reEnqueueRun(input.workspaceRoot, runId);
  return { ok: true, runId };
}

export async function recordBriefAdjustmentAndReAuthor(input: {
  workspaceRoot: string;
  runId?: string;
  entry: BriefAdjustmentEntry;
}): Promise<BriefGateResult> {
  const runId = input.runId ?? findLatestRunAtBriefReview(input.workspaceRoot);
  if (!runId) return { ok: false, reason: "no-run-at-brief-review" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  const state = readRunStateSnapshot(runDir);
  if (!state || state.phase !== "brief-review" || state.blocker) {
    return { ok: false, reason: "state-not-brief-review" };
  }
  appendBriefAdjustment(runDir, input.entry);
  // Bounce phase back to briefing so the runner re-composes the brief with
  // the new adjustment in mind. Auto-walker will advance to brief-review
  // again on the next tick.
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, { ...state, phase: "briefing", updatedAt: now });
  appendArtLabEvent(runDir, {
    runId,
    at: now,
    kind: "phase-transition",
    payload: { from: "brief-review", to: "briefing", source: "bot", adjustment: input.entry.dimension },
  });
  reEnqueueRun(input.workspaceRoot, runId);
  return { ok: true, runId };
}

export async function cancelBrief(input: { workspaceRoot: string; runId?: string }): Promise<BriefGateResult> {
  const runId = input.runId ?? findLatestRunAtBriefReview(input.workspaceRoot);
  if (!runId) return { ok: false, reason: "no-run-at-brief-review" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  const state = readRunStateSnapshot(runDir);
  if (!state) return { ok: false, reason: "state-missing" };
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, { ...state, blocker: "cancelled", updatedAt: now });
  appendArtLabEvent(runDir, {
    runId,
    at: now,
    kind: "phase-transition",
    payload: { from: state.phase, to: state.phase, blocker: "cancelled", source: "bot" },
  });
  return { ok: true, runId };
}

export function findParkedBriefRunForChat(workspaceRoot: string, chatId: number): string | null {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return null;
const candidates: Array<{ runId: string; updatedAt: string }> = [];
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    const runDir = join(runsDir, id);
    const state = readRunStateSnapshot(runDir);
    if (!state || state.blocker || state.phase !== "brief-review") continue;
    // Match by chatId from queue-entry.json
    const queueEntryPath = join(runDir, "queue-entry.json");
    if (!existsSync(queueEntryPath)) continue;
    try {
      const entry = JSON.parse(readFileSync(queueEntryPath, "utf8")) as { spec?: { chatId?: number } };
      if (entry.spec?.chatId === chatId) {
        candidates.push({ runId: id, updatedAt: state.updatedAt });
      }
    } catch { /* skip */ }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return candidates[0]!.runId;
}
