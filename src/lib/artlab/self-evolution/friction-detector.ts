// src/lib/artlab/self-evolution/friction-detector.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const FRICTION_THRESHOLD = 5;

interface ImprovementEvent {
  at: string;
  failureCode: string;
  severity: "low" | "medium" | "high";
  runId?: string;
  context?: Record<string, unknown>;
}

export interface FrictionGroup {
  failureCode: string;
  occurrences: number;
  highestSeverity: "low" | "medium" | "high";
  mostRecentAt: string;
  recentContext: Record<string, unknown>[];
}

export interface FrictionDetectionResult {
  actionable: FrictionGroup[];
  belowThreshold: FrictionGroup[];
}

const SEVERITY_RANK: Record<ImprovementEvent["severity"], number> = { low: 0, medium: 1, high: 2 };

export async function detectFriction(input: { workspaceRoot: string }): Promise<FrictionDetectionResult> {
  const path = join(input.workspaceRoot, "ledgers", "improvements.jsonl");
  if (!existsSync(path)) return { actionable: [], belowThreshold: [] };
  const lines = readFileSync(path, "utf8").trim().split("\n").filter((l) => l.length > 0);
  const groups = new Map<string, FrictionGroup>();
  for (const line of lines) {
    let event: ImprovementEvent;
    try { event = JSON.parse(line) as ImprovementEvent; } catch { continue; }
    let group = groups.get(event.failureCode);
    if (!group) {
      group = {
        failureCode: event.failureCode,
        occurrences: 0,
        highestSeverity: "low",
        mostRecentAt: event.at,
        recentContext: [],
      };
      groups.set(event.failureCode, group);
    }
    group.occurrences += 1;
    if (SEVERITY_RANK[event.severity] > SEVERITY_RANK[group.highestSeverity]) {
      group.highestSeverity = event.severity;
    }
    if (event.at > group.mostRecentAt) group.mostRecentAt = event.at;
    if (event.context) group.recentContext.push(event.context);
  }
  const actionable: FrictionGroup[] = [];
  const belowThreshold: FrictionGroup[] = [];
  for (const group of groups.values()) {
    group.recentContext = group.recentContext.slice(-10);
    if (group.occurrences >= FRICTION_THRESHOLD && SEVERITY_RANK[group.highestSeverity] >= 1) {
      actionable.push(group);
    } else {
      belowThreshold.push(group);
    }
  }
  return { actionable, belowThreshold };
}
