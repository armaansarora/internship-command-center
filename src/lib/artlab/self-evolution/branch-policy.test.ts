// src/lib/artlab/self-evolution/branch-policy.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCodexGoal } from "./codex-summoner";

describe("self-evolution branch policy (spec safety property #5)", () => {
  it("every codex goal explicitly bans gh pr create / gh pr merge", () => {
    const group = {
      failureCode: "any-code",
      occurrences: 5,
      highestSeverity: "medium" as const,
      mostRecentAt: "2026-05-20T00:00:00Z",
      recentContext: [],
    };
    const goal = buildCodexGoal(group, "2026-05-20");
    expect(goal).toMatch(/do not open a pr/i);
    expect(goal).toMatch(/gh pr create/i);
    expect(goal).toMatch(/gh pr merge/i);
  });

  it("module surface never exports a 'mergePR' or 'openPR' function", () => {
    const codexSummoner = readFileSync(
      join("src", "lib", "artlab", "self-evolution", "codex-summoner.ts"),
      "utf8",
    );
    const scheduler = readFileSync(
      join("src", "lib", "artlab", "self-evolution", "scheduler.ts"),
      "utf8",
    );
    expect(codexSummoner).not.toMatch(/openPR|mergePR|gh\s+pr\s+(create|merge)/);
    expect(scheduler).not.toMatch(/openPR|mergePR|gh\s+pr\s+(create|merge)/);
  });
});
