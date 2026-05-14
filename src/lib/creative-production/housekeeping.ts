import type { ImprovementEntry } from "./improvement";
import type { CreativeEveryPhaseGate, CreativePhaseId } from "./types";

export interface HousekeepingEntry {
  gate: "housekeeping";
  status: "passed";
  recordedAt: string;
  runId: string;
  phase: CreativePhaseId;
  created: string[];
  kept: string[];
  archived: string[];
  deleted: string[];
  notes: string;
}

export type CreativeGateEntry = HousekeepingEntry | ImprovementEntry;

export interface PhaseGateValidationResult {
  ok: boolean;
  missing: CreativeEveryPhaseGate[];
}

export function createHousekeepingEntry(
  input: Omit<HousekeepingEntry, "gate" | "status" | "recordedAt">,
): HousekeepingEntry {
  return {
    gate: "housekeeping",
    status: "passed",
    recordedAt: new Date().toISOString(),
    ...input,
  };
}

export function validateRequiredPhaseGates(
  runId: string,
  phase: CreativePhaseId,
  entries: CreativeGateEntry[],
): PhaseGateValidationResult {
  const matchingEntries = entries.filter((entry) => entry.runId === runId && entry.phase === phase);
  const hasPassingHousekeeping = matchingEntries.some(
    (entry) =>
      entry.gate === "housekeeping" &&
      entry.status === "passed" &&
      entry.notes.trim().length > 0 &&
      entry.kept.every((path) => path.trim().length > 0),
  );
  const hasActionableImprovement = matchingEntries.some(
    (entry) =>
      entry.gate === "continuous-improvement" &&
      entry.finding.trim().length > 0 &&
      entry.action.trim().length > 0,
  );
  const missing: CreativeEveryPhaseGate[] = [];

  if (!hasPassingHousekeeping) missing.push("housekeeping");
  if (!hasActionableImprovement) missing.push("continuous-improvement");

  return {
    ok: missing.length === 0,
    missing,
  };
}
