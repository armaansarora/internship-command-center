// src/lib/artlab/self-evolution/codex-summoner.ts
import { invokeCodex } from "@/lib/artlab/adapters/codex";
import type { FrictionGroup } from "./friction-detector";

export interface SummonCodexInput {
  group: FrictionGroup;
  cwd: string;
  today: string; // ISO date string YYYY-MM-DD
}

export interface SummonCodexResult {
  mode: "real" | "mock";
  branchName: string;
  goalSent: string;
  exitCode?: number;
  summary?: string;
}

export function buildCodexGoal(group: FrictionGroup, today: string): string {
  const branchName = `artlab/fix/${group.failureCode}-${today}`;
  return [
    `Goal: harden the ArtLab engine against repeated failure: ${group.failureCode}.`,
    `${group.occurrences} occurrences observed (highest severity: ${group.highestSeverity}, most recent: ${group.mostRecentAt}).`,
    "Recent context (last 10 events):",
    JSON.stringify(group.recentContext, null, 2),
    "",
    "Required steps:",
    `1. git checkout -b ${branchName}`,
    "2. Read the relevant ArtLab module(s) and the spec at docs/superpowers/specs/2026-05-20-artlab-creative-engine-design.md.",
    "3. Add a test that would have caught this failure.",
    "4. Implement the fix.",
    "5. Run vitest + tsc + lint; all must pass.",
    "6. git commit with a descriptive message including the failure code.",
    "7. git push the branch.",
    "",
    "DO NOT OPEN A PR. Never run gh pr create or gh pr merge. ArtLab spec safety property #5 requires human review of every branch before merge.",
    "",
    `Branch must be named exactly: ${branchName}`,
  ].join("\n");
}

export async function summonCodex(input: SummonCodexInput): Promise<SummonCodexResult> {
  const branchName = `artlab/fix/${input.group.failureCode}-${input.today}`;
  const goalSent = buildCodexGoal(input.group, input.today);
  const result = await invokeCodex({
    goal: goalSent,
    sandboxLevel: "workspace-write",
    cwd: input.cwd,
    approvalPolicy: "never",
  });
  return {
    mode: result.mode,
    branchName,
    goalSent,
    exitCode: result.exitCode,
    summary: result.summary,
  };
}
