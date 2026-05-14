import { mkdir, readFile, writeFile } from "node:fs/promises";
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

function stableLedgerKey(entry: unknown): string {
  if (!entry || typeof entry !== "object") return JSON.stringify(entry);

  const { recordedAt: _recordedAt, ...stableEntry } = entry as Record<string, unknown>;

  return JSON.stringify(stableEntry);
}

export async function writeJsonlEntry(path: string, entry: unknown): Promise<void> {
  const absolutePath = resolve(path);
  const nextLine = JSON.stringify(entry);
  const nextKey = stableLedgerKey(entry);

  await mkdir(dirname(absolutePath), { recursive: true });

  const existingLines = (await readFile(absolutePath, "utf8").catch(() => ""))
    .split("\n")
    .filter(Boolean);
  const seenKeys = new Set<string>();
  const compactedLines: string[] = [];

  for (const line of existingLines) {
    let key = line;

    try {
      key = stableLedgerKey(JSON.parse(line));
    } catch {
      // Keep invalid historical lines addressable instead of silently deleting them.
    }

    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    compactedLines.push(line);
  }

  if (!seenKeys.has(nextKey)) {
    compactedLines.push(nextLine);
  }

  const retainedLines = compactedLines.slice(-500);

  if (retainedLines.length !== existingLines.length || !seenKeys.has(nextKey)) {
    await writeFile(absolutePath, `${retainedLines.join("\n")}\n`);
  }
}
