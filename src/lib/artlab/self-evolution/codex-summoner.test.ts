// src/lib/artlab/self-evolution/codex-summoner.test.ts
import { describe, expect, it } from "vitest";
import { buildCodexGoal, summonCodex } from "./codex-summoner";

describe("codex summoner", () => {
  const group = {
    failureCode: "rembg-edge-halo",
    occurrences: 7,
    highestSeverity: "medium" as const,
    mostRecentAt: "2026-05-20T03:14:00Z",
    recentContext: [{ slotId: "slot-12" }],
  };

  it("buildCodexGoal includes the failureCode, occurrence count, and a branch name", () => {
    const goal = buildCodexGoal(group, "2026-05-20");
    expect(goal).toContain("rembg-edge-halo");
    expect(goal).toContain("7 occurrences");
    expect(goal).toContain("artlab/fix/rembg-edge-halo-2026-05-20");
    expect(goal).toMatch(/do not open a pr/i);
    expect(goal).toMatch(/never run\s+`?gh pr/i);
  });

  it("summonCodex skips when ARTLAB_CODEX_MODE=mock and reports the would-be branch name", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const result = await summonCodex({ group, cwd: "/tmp", today: "2026-05-20" });
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.mode).toBe("mock");
    expect(result.branchName).toBe("artlab/fix/rembg-edge-halo-2026-05-20");
  });
});
