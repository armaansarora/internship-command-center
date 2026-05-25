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
  return findParkedRunForChat(workspaceRoot, chatId, ["brief-review"]);
}

export function findParkedConceptRunForChat(workspaceRoot: string, chatId: number): string | null {
  return findParkedRunForChat(workspaceRoot, chatId, ["concept-review"]);
}

// Returns the SINGLE most-recently-updated parked run for the chat across
// both brief-review and concept-review. The routing layer uses this to
// decide where a free-text message goes — the run the user just interacted
// with wins, not whichever phase happens to be alphabetically first.
export function findMostRecentParkedRunForChat(
  workspaceRoot: string,
  chatId: number,
): { runId: string; phase: "brief-review" | "concept-review" } | null {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return null;
  let best: { runId: string; phase: "brief-review" | "concept-review"; updatedAt: string } | null = null;
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    const runDir = join(runsDir, id);
    const state = readRunStateSnapshot(runDir);
    if (!state || state.blocker) continue;
    if (state.phase !== "brief-review" && state.phase !== "concept-review") continue;
    const queueEntryPath = join(runDir, "queue-entry.json");
    if (!existsSync(queueEntryPath)) continue;
    try {
      const entry = JSON.parse(readFileSync(queueEntryPath, "utf8")) as { spec?: { chatId?: number } };
      if (entry.spec?.chatId !== chatId) continue;
    } catch { continue; }
    if (!best || state.updatedAt > best.updatedAt) {
      best = { runId: id, phase: state.phase, updatedAt: state.updatedAt };
    }
  }
  return best ? { runId: best.runId, phase: best.phase } : null;
}

// Cancels every parked run for a chat (across brief-review, concept-review,
// final-review, AND blocked-with-cancellable-blocker). Returns count.
export function cancelAllParkedRunsForChat(workspaceRoot: string, chatId: number): number {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return 0;
  let cancelled = 0;
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    const runDir = join(runsDir, id);
    const state = readRunStateSnapshot(runDir);
    if (!state) continue;
    if (state.phase === "closed") continue;
    if (state.blocker === "cancelled") continue;
    const queueEntryPath = join(runDir, "queue-entry.json");
    if (!existsSync(queueEntryPath)) continue;
    try {
      const entry = JSON.parse(readFileSync(queueEntryPath, "utf8")) as { spec?: { chatId?: number } };
      if (entry.spec?.chatId !== chatId) continue;
    } catch { continue; }
    const now = new Date().toISOString();
    writeRunStateSnapshot(runDir, { ...state, blocker: "cancelled", updatedAt: now });
    appendArtLabEvent(runDir, {
      runId: id,
      at: now,
      kind: "phase-transition",
      payload: { from: state.phase, to: state.phase, blocker: "cancelled", source: "bot-cancel-all" },
    });
    cancelled += 1;
  }
  return cancelled;
}

// Auto-cancel any parked run > 30 min old for the given chat. Called on
// every free-text message — keeps the parked-run set fresh so stale runs
// from prior broken sessions don't hijack new feedback.
export function autoCancelStaleParkedRuns(workspaceRoot: string, chatId: number, maxAgeMs = 30 * 60 * 1000): number {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return 0;
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  let cancelled = 0;
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    const runDir = join(runsDir, id);
    const state = readRunStateSnapshot(runDir);
    if (!state) continue;
    if (state.phase === "closed" || state.blocker === "cancelled") continue;
    if (state.phase !== "brief-review" && state.phase !== "concept-review" && state.phase !== "final-review") continue;
    if (state.updatedAt >= cutoff) continue; // still fresh
    const queueEntryPath = join(runDir, "queue-entry.json");
    if (!existsSync(queueEntryPath)) continue;
    try {
      const entry = JSON.parse(readFileSync(queueEntryPath, "utf8")) as { spec?: { chatId?: number } };
      if (entry.spec?.chatId !== chatId) continue;
    } catch { continue; }
    const now = new Date().toISOString();
    writeRunStateSnapshot(runDir, { ...state, blocker: "cancelled", updatedAt: now });
    appendArtLabEvent(runDir, {
      runId: id,
      at: now,
      kind: "phase-transition",
      payload: { from: state.phase, to: state.phase, blocker: "cancelled", source: "auto-cancel-stale" },
    });
    cancelled += 1;
  }
  return cancelled;
}

function findParkedRunForChat(
  workspaceRoot: string,
  chatId: number,
  phases: readonly string[],
): string | null {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return null;
  const candidates: Array<{ runId: string; updatedAt: string }> = [];
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    const runDir = join(runsDir, id);
    const state = readRunStateSnapshot(runDir);
    if (!state || state.blocker || !phases.includes(state.phase)) continue;
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

// When the user types free-text while a concept-review is parked, treat the
// text as a free-text refinement note: append to concept-feedback.jsonl and
// bump state to refining-concepts so the next worker tick regenerates.
export async function recordConceptFeedbackAndRefine(input: {
  workspaceRoot: string;
  runId: string;
  freeText: string;
}): Promise<BriefGateResult> {
  const runDir = join(input.workspaceRoot, "runs", input.runId);
  const state = readRunStateSnapshot(runDir);
  if (!state || state.phase !== "concept-review" || state.blocker) {
    return { ok: false, reason: "state-not-concept-review" };
  }
  const { appendConceptFeedback } = await import("@/lib/artlab/brainstorm/feedback-ledger");
  appendConceptFeedback(runDir, {
    at: new Date().toISOString(),
    polarity: "freetext",
    freeText: input.freeText,
  });
  const now = new Date().toISOString();
  writeRunStateSnapshot(runDir, { ...state, phase: "refining-concepts", updatedAt: now });
  appendArtLabEvent(runDir, {
    runId: input.runId,
    at: now,
    kind: "phase-transition",
    payload: { from: "concept-review", to: "refining-concepts", source: "bot", trigger: "freetext-feedback" },
  });
  reEnqueueRun(input.workspaceRoot, input.runId);
  return { ok: true, runId: input.runId };
}
