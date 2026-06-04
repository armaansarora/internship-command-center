import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { ArtLabBlocker, ArtLabPhase, ArtLabRunState } from "../types";
import { readRunStateSnapshot, readProgressSnapshot } from "./snapshots";
import { readArtLabEvents, type ArtLabEvent } from "./events";

export interface RunRealitySpend {
  actualCents: number;
  reservedCents: number;
  refundedCents: number;
  monthlySpentCents: number;
  monthlyCeilingCents: number;
}

export interface RunRealitySlots {
  completed: number;
  running: number;
  failed: number;
  pending: number;
}

export interface RunReality {
  runId: string;
  assetType: ArtLabRunState["assetType"];
  phase: ArtLabPhase;
  blocker?: ArtLabBlocker;
  slots: RunRealitySlots;
  spend: RunRealitySpend;
  approvedConcept?: ArtLabRunState["approvedConcept"];
  health: {
    activeLeaseCount: number;
    lastHeartbeatAt?: string;
  };
  progress: {
    phaseStartedAt?: string;
    phaseElapsedMs?: number;
    estimatedRemainingMs?: number;
    /** Total slot files expected for this phase (e.g. 21 for production). */
    expectedSlotCount?: number;
    /** Slot files actually on disk right now. */
    renderedSlotCount?: number;
  };
  events: ArtLabEvent[];
  raw: ArtLabRunState;
}

const MonthlySpendShapeSchema = z.object({
  monthlySpentCents: z.number().int().min(0),
  monthlyCeilingCents: z.number().int().min(0),
});

function readMonthlySpend(runDir: string): { monthlySpentCents: number; monthlyCeilingCents: number } {
  const path = join(runDir, "monthly-spend.json");
  if (!existsSync(path)) return { monthlySpentCents: 0, monthlyCeilingCents: 0 };
  // Degrade gracefully on a corrupt/partial file (matches the other readers
  // here): one bad monthly-spend.json must not throw out of readRunReality and
  // abort crash-recovery for every subsequent run.
  try {
    return MonthlySpendShapeSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return { monthlySpentCents: 0, monthlyCeilingCents: 0 };
  }
}

function countActiveLeases(runDir: string): number {
  const dir = join(runDir, "slot-leases");
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".lease.json")).length;
}

// Rough per-phase wall-time budget in ms. Used to compute "remaining" hints
// in /status. Pulled from the same numbers as PHASE_ETA_HINT in templates.
const PHASE_TARGET_MS: Partial<Record<ArtLabPhase, number>> = {
  routed: 5_000,
  briefing: 10_000,
  "generating-concepts": 45_000,
  "refining-concepts": 45_000,
  canary: 5_000,
  production: 210_000,        // ~3.5 min
  "strict-qa": 30_000,
  promoting: 10_000,
  verifying: 5_000,
};

const PHASE_SLOT_DIR: Partial<Record<ArtLabPhase, { dir: string; expected: number }>> = {
  "generating-concepts": { dir: "concept-slots", expected: 5 },
  "refining-concepts": { dir: "concept-slots", expected: 5 },
  production: { dir: "production-slots", expected: 21 },
  "strict-qa": { dir: "cutouts", expected: 21 },
};

function countPngsIn(runDir: string, sub: string): number {
  const path = join(runDir, sub);
  if (!existsSync(path)) return 0;
  try { return readdirSync(path).filter((f) => f.endsWith(".png")).length; }
  catch { return 0; }
}

function computeProgress(runDir: string, state: ArtLabRunState, now: () => Date): RunReality["progress"] {
  const phaseStartedAt = state.phaseStartedAt;
  const phaseTarget = PHASE_TARGET_MS[state.phase];
  const slotInfo = PHASE_SLOT_DIR[state.phase];
  let phaseElapsedMs: number | undefined;
  let estimatedRemainingMs: number | undefined;
  if (phaseStartedAt) {
    const startMs = new Date(phaseStartedAt).getTime();
    if (Number.isFinite(startMs)) {
      phaseElapsedMs = Math.max(0, now().getTime() - startMs);
      if (phaseTarget !== undefined) {
        estimatedRemainingMs = Math.max(0, phaseTarget - phaseElapsedMs);
      }
    }
  }
  let expectedSlotCount: number | undefined;
  let renderedSlotCount: number | undefined;
  if (slotInfo) {
    expectedSlotCount = slotInfo.expected;
    renderedSlotCount = countPngsIn(runDir, slotInfo.dir);
  }
  return { phaseStartedAt, phaseElapsedMs, estimatedRemainingMs, expectedSlotCount, renderedSlotCount };
}

export async function readRunReality(runDir: string, now: () => Date = () => new Date()): Promise<RunReality | null> {
  const state = readRunStateSnapshot(runDir);
  if (!state) return null;
  const progress = readProgressSnapshot(runDir);
  const events = readArtLabEvents(runDir).slice(-20);
  const monthly = readMonthlySpend(runDir);
  return {
    runId: state.runId,
    assetType: state.assetType,
    phase: state.phase,
    blocker: state.blocker,
    approvedConcept: state.approvedConcept,
    slots: {
      completed: progress?.slotsCompleted ?? 0,
      running: progress?.slotsRunning ?? 0,
      failed: progress?.slotsFailed ?? 0,
      pending: 0,
    },
    spend: {
      actualCents: progress?.actualSpendCents ?? 0,
      reservedCents: progress?.reservedCents ?? 0,
      refundedCents: 0,
      monthlySpentCents: monthly.monthlySpentCents,
      monthlyCeilingCents: monthly.monthlyCeilingCents,
    },
    health: {
      activeLeaseCount: countActiveLeases(runDir),
      lastHeartbeatAt: progress?.at,
    },
    progress: computeProgress(runDir, state, now),
    events,
    raw: state,
  };
}
