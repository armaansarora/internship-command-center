import { describe, expect, it } from "vitest";
import { createSpriteAnimatorBrain } from "./sprite-animator-brain";

describe("sprite-animator brain", () => {
  const brain = createSpriteAnimatorBrain({
    apiKey: "sk-fake",
    model: "claude-opus-4-7-test",
    dryRun: true,
  });

  it("reports its agent kind", () => {
    expect(brain.agent).toBe("sprite-animator");
  });

  it("system prompt mentions frame budget and easing", () => {
    expect(brain.systemPrompt).toMatch(/frame|easing/i);
  });

  it("decides for a Sol Navarro idle animation request", async () => {
    const result = await brain.decide({
      characterId: "sol-navarro",
      directive: "idle breathe loop, 1.2s, ease-in-out",
      targetFormat: "sprite-sheet",
      frameBudget: 24,
      recentWins: [],
      recentRejections: [],
    });
    expect(result.agent).toBe("sprite-animator");
    expect(result.output).toBeDefined();
  });

  it("rejects unrealistic frame budgets", async () => {
    await expect(
      brain.decide({
        characterId: "sol-navarro",
        directive: "x",
        targetFormat: "sprite-sheet",
        frameBudget: 0,
        recentWins: [],
        recentRejections: [],
      }),
    ).rejects.toThrow();
  });
});
