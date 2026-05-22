// src/lib/artlab/self-evolution/branch-policy.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildCodexGoal, summonCodex } from "./codex-summoner";

const SELF_EVOLUTION_DIR = join("src", "lib", "artlab", "self-evolution");

function walkSelfEvolutionSourceFiles(): string[] {
  const out: string[] = [];
  for (const file of readdirSync(SELF_EVOLUTION_DIR)) {
    if (file.endsWith(".test.ts")) continue;
    const full = join(SELF_EVOLUTION_DIR, file);
    if (statSync(full).isFile() && file.endsWith(".ts")) out.push(full);
  }
  return out;
}

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

  it("summonCodex actually invokes the adapter with a ban-string-bearing goal (via mock-mode echo summary)", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    let result;
    try {
      result = await summonCodex({
        group: {
          failureCode: "rembg-edge-halo",
          occurrences: 1,
          highestSeverity: "low",
          mostRecentAt: "2026-05-22T00:00:00Z",
          recentContext: [],
        },
        cwd: ".",
        today: "2026-05-22",
      });
    } finally {
      delete process.env.ARTLAB_CODEX_MODE;
    }
    expect(result.mode).toBe("mock");
    // The mock adapter echoes the sent goal into result.summary as `mock codex received: <goal>`.
    expect(result.goalSent).toMatch(/gh pr create/i);
    expect(result.goalSent).toMatch(/gh pr merge/i);
    expect(result.summary ?? "").toContain(result.goalSent);
  });

  it("no self-evolution source file exports an openPR/mergePR identifier or shells out to gh pr create|merge", () => {
    const files = walkSelfEvolutionSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const exportedAdverse = /export\s+(async\s+)?function\s+(openPR|mergePR)\b/;
      const exportedConst = /export\s+const\s+(openPR|mergePR)\b/;
      const shellCall = /\b(spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(\s*["'`]gh["'`][^)]*["'`]pr["'`][^)]*["'`](create|merge)["'`]/;
      const shellInline = /\b(spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(\s*["'`]gh\s+pr\s+(create|merge)/;
      expect(exportedAdverse.test(text), `unexpected exported function in ${file}`).toBe(false);
      expect(exportedConst.test(text), `unexpected exported const in ${file}`).toBe(false);
      expect(shellCall.test(text), `gh pr shell-call in ${file}`).toBe(false);
      expect(shellInline.test(text), `gh pr inline shell-call in ${file}`).toBe(false);
    }
  });
});
