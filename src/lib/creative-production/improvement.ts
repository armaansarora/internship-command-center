import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CreativePhaseId } from "./types";

export type ImprovementCategory =
  | "slow"
  | "manual-step"
  | "error"
  | "quality-failure"
  | "confusion"
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
  const highSeverity = entries.some(
    (entry) => entry.severity === "high" || entry.category === "rewrite-needed",
  );

  return repeatedManualSteps || highSeverity;
}

export async function writeJsonlEntry(path: string, entry: unknown): Promise<void> {
  const absolutePath = resolve(path);
  const nextLine = JSON.stringify(entry);

  await mkdir(dirname(absolutePath), { recursive: true });
  await appendFile(absolutePath, `${nextLine}\n`);
}
