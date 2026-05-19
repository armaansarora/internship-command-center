import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CreativePhaseId } from "./types";

export type ImprovementCategory =
  | "slow"
  | "manual-step"
  | "error"
  | "quality"
  | "quality-failure"
  | "confusion"
  | "workflow"
  | "cleanup"
  | "engine-upgrade"
  | "rewrite-needed";

export interface ImprovementEntry {
  gate: "continuous-improvement";
  recordedAt: string;
  runId: string;
  phase: CreativePhaseId;
  category: ImprovementCategory;
  severity: "low" | "medium" | "high";
  finding: string;
  action: string;
}

export interface CreativeImprovementCategoryCount {
  category: ImprovementCategory;
  count: number;
}

export interface CreativeImprovementLoopSummary {
  runsObserved: number;
  entriesObserved: number;
  entriesSinceLastUpgrade: number;
  maturityStage: "learning" | "watch" | "upgrade-required";
  upgradeRequired: boolean;
  repeatedCategories: CreativeImprovementCategoryCount[];
  highSeverityFindings: string[];
  nextActions: string[];
}

export function createImprovementEntry(
  input: Omit<ImprovementEntry, "gate" | "recordedAt">,
): ImprovementEntry {
  return {
    gate: "continuous-improvement",
    recordedAt: new Date().toISOString(),
    ...input,
  };
}

export function shouldTriggerEngineUpgrade(entries: ImprovementEntry[]): boolean {
  const repeatedManualSteps = entries.filter((entry) => entry.category === "manual-step").length >= 2;
  const repeatedQualityFailures = entries.filter((entry) => entry.category === "quality-failure").length >= 2;
  const highSeverity = entries.some(
    (entry) => entry.severity === "high" || entry.category === "rewrite-needed",
  );

  return repeatedManualSteps || repeatedQualityFailures || highSeverity;
}

export function summarizeCreativeImprovementLoop(
  entries: ImprovementEntry[],
): CreativeImprovementLoopSummary {
  const lastUpgradeIndex = entries.map((entry) => entry.category).lastIndexOf("engine-upgrade");
  const activeEntries = lastUpgradeIndex === -1 ? entries : entries.slice(lastUpgradeIndex + 1);
  const runsObserved = new Set(activeEntries.map((entry) => entry.runId)).size;
  const categoryCounts = activeEntries.reduce((counts, entry) => {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    return counts;
  }, new Map<ImprovementCategory, number>());
  const repeatedCategories = [...categoryCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
  const highSeverityFindings = activeEntries
    .filter((entry) => entry.severity === "high" || entry.category === "rewrite-needed")
    .map((entry) => `${entry.category}: ${entry.finding}`);
  const upgradeRequired =
    shouldTriggerEngineUpgrade(activeEntries) ||
    runsObserved >= 5 && repeatedCategories.length > 0;
  const maturityStage: CreativeImprovementLoopSummary["maturityStage"] = upgradeRequired
    ? "upgrade-required"
    : runsObserved >= 3
      ? "watch"
      : "learning";
  const nextActions = upgradeRequired
    ? [
        `Patch the engine before continuing production for repeated categories: ${repeatedCategories.map((entry) => entry.category).join(", ") || "high-severity failure"}.`,
        repeatedCategories.some((entry) => entry.category === "quality-failure")
          ? "Quality failures must become a validation gate, repair command, or production blocker before the next asset reaches review."
          : "Convert the repeated friction into a command, fixture, or QA gate before the next asset run.",
        "Re-run the focused Creative Production Engine tests after the patch.",
      ]
    : [
        "Keep recording housekeeping and continuous-improvement entries every phase.",
        "Escalate to an engine patch if the same friction repeats or becomes high severity.",
      ];

  return {
    runsObserved,
    entriesObserved: entries.length,
    entriesSinceLastUpgrade: activeEntries.length,
    maturityStage,
    upgradeRequired,
    repeatedCategories,
    highSeverityFindings,
    nextActions,
  };
}

export async function writeJsonlEntry(path: string, entry: unknown): Promise<void> {
  const absolutePath = resolve(path);
  const nextLine = JSON.stringify(entry);

  await mkdir(dirname(absolutePath), { recursive: true });
  await appendFile(absolutePath, `${nextLine}\n`);
}
