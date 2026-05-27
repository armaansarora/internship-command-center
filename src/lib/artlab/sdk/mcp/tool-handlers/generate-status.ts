import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ArtLabGenerateStatusInputSchema,
  ArtLabGenerateStatusOutputSchema,
  type ArtLabGenerateStatusOutput,
  type ArtLabRunStatus,
} from "../tools";
import type { ArtLabGenerateContext } from "./generate";

interface ArtLabRunStateLite {
  runId: string;
  phase: string;
  blocker: string | null;
  createdAt: string;
  updatedAt: string;
  progress?: {
    phaseElapsedMs?: number;
    estimatedRemainingMs?: number;
    expectedSlotCount?: number;
    renderedSlotCount?: number;
  };
  promotedPackId?: string;
}

/**
 * Map an ArtLab run-state `(phase, blocker)` pair onto the ArtLab MCP run
 * status enum.
 *
 * Order matters. In production, terminal lifecycle events surface as
 * `blocker: "cancelled"` or `blocker: "failed"` rather than as phase values.
 * The previous implementation tested `blocker` first and returned the generic
 * `'blocked'` for both — so cancelled runs leaked out as "blocked" and
 * consumers could not distinguish "user cancelled" from "system blocker".
 *
 * The fix is to hoist the terminal-blocker check above the generic-blocker
 * branch:
 *
 *   1. `blocker === "cancelled"` → `'cancelled'` (terminal, user-initiated)
 *   2. `blocker === "failed"`    → `'failed'`    (terminal, system-initiated)
 *   3. `blocker` set otherwise   → `'blocked'`   (recoverable, awaiting input)
 *   4. phase-based mapping       → `'promoted' | 'cancelled' | 'failed' | 'running'`
 *
 * The literal string `"null"` is treated as no-blocker because some JSON
 * writers stringify null as the four-character literal.
 */
function mapStatus(phase: string, blocker: string | null): ArtLabRunStatus {
  if (blocker && blocker !== "null") {
    if (blocker === "cancelled") return "cancelled";
    if (blocker === "failed") return "failed";
    return "blocked";
  }
  if (phase === "closed") return "promoted";
  if (phase === "cancelled") return "cancelled";
  if (phase === "failed") return "failed";
  return "running";
}

function computePercent(state: ArtLabRunStateLite): number {
  if (state.phase === "closed") return 100;
  const expected = state.progress?.expectedSlotCount ?? 0;
  const rendered = state.progress?.renderedSlotCount ?? 0;
  if (expected > 0) return Math.min(99, Math.round((rendered / expected) * 100));
  return 25;
}

function computeEta(state: ArtLabRunStateLite): number | undefined {
  const remaining = state.progress?.estimatedRemainingMs;
  if (typeof remaining === "number" && remaining > 0) return Math.round(remaining / 1000);
  return undefined;
}

/**
 * Lifecycle of a `artlab/generate` runId, from the status tool's POV:
 *
 *   1. MCP `generate` writes `inbox/sdk/generate-<runId>.json`.
 *      → status returns `queued`, percent=0, phase="queued".
 *   2. Daemon's `sdk-poller` drains the inbox, writes
 *      `runs/<runId>/run-state.json` with phase=routed, enqueues the run, and
 *      moves the inbox file into `inbox/sdk/.processed/<runId>.json`.
 *      → status returns `running`, mapped from the run-state phase.
 *   3. Run-worker advances the run; eventually `phase=closed` with
 *      `promotedPackId` populated.
 *      → status returns `promoted`.
 *   4. If a blocker lands on the state, status returns `blocked`
 *      (or `failed`/`cancelled` for terminal blockers).
 *
 * The status tool MUST handle the gap between MCP write and poller pickup;
 * before this change it threw "run not found" during step 1 even though the
 * runId was perfectly valid.
 */
function inboxPathFor(workspaceRoot: string, runId: string): string {
  return join(workspaceRoot, "inbox", "sdk", `generate-${runId}.json`);
}

/**
 * Synthesise a queued-status payload when only the inbox file exists. We use
 * the inbox file's mtime as `updatedAt` so callers see a real timestamp
 * (otherwise the schema rejects an empty string).
 */
function queuedPayload(
  workspaceRoot: string,
  runId: string,
): ArtLabGenerateStatusOutput {
  const inboxPath = inboxPathFor(workspaceRoot, runId);
  const mtime = statSync(inboxPath).mtime.toISOString();
  return ArtLabGenerateStatusOutputSchema.parse({
    runId,
    status: "queued",
    phase: "queued",
    percentComplete: 0,
    blockers: [],
    updatedAt: mtime,
  });
}

/**
 * Inbox file may have already been archived into `.processed/`. We don't use
 * that to flip back to `queued` (run-state.json now drives the picture), but
 * we expose it via this helper so callers can verify the poller actually
 * consumed the file. Returns true iff a `generate-<runId>.json` (live or
 * archived) ever landed in the sdk inbox.
 */
function inboxFileEverSeen(workspaceRoot: string, runId: string): boolean {
  if (existsSync(inboxPathFor(workspaceRoot, runId))) return true;
  const processed = join(workspaceRoot, "inbox", "sdk", ".processed");
  if (!existsSync(processed)) return false;
  try {
    return readdirSync(processed).includes(`${runId}.json`);
  } catch {
    return false;
  }
}

export async function handleArtLabGenerateStatus(
  rawInput: unknown,
  ctx: ArtLabGenerateContext,
): Promise<ArtLabGenerateStatusOutput> {
  const input = ArtLabGenerateStatusInputSchema.parse(rawInput);
  const statePath = join(ctx.workspaceRoot, "runs", input.runId, "run-state.json");

  // Stage 1: poller hasn't picked it up yet — return queued.
  if (!existsSync(statePath)) {
    if (existsSync(inboxPathFor(ctx.workspaceRoot, input.runId))) {
      return queuedPayload(ctx.workspaceRoot, input.runId);
    }
    // Neither inbox nor run-state present → genuinely unknown runId.
    // Surface the .processed/ check in the error so operators can tell
    // "MCP never received this" from "I lost the run dir somehow".
    const seen = inboxFileEverSeen(ctx.workspaceRoot, input.runId);
    throw new Error(
      seen
        ? `run not found: ${input.runId} (inbox was processed but run-state.json missing — see daemon-errors.jsonl)`
        : `run not found: ${input.runId}`,
    );
  }

  // Stage 2+: read the canonical state.
  const state = JSON.parse(readFileSync(statePath, "utf8")) as ArtLabRunStateLite;
  const status = mapStatus(state.phase, state.blocker);
  return ArtLabGenerateStatusOutputSchema.parse({
    runId: input.runId,
    status,
    phase: state.phase,
    percentComplete: computePercent(state),
    blockers: state.blocker ? [state.blocker] : [],
    etaSeconds: computeEta(state),
    promotedPackId: state.promotedPackId,
    updatedAt: state.updatedAt,
  });
}
