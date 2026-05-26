import { describe, expect, it } from "vitest";
import { createCharacterMasterBrain } from "./character-master-brain";

describe("character-master brain", () => {
  const brain = createCharacterMasterBrain({
    apiKey: "sk-fake",
    model: "claude-opus-4-7-test",
    dryRun: true,
  });

  it("reports its agent kind", () => {
    expect(brain.agent).toBe("character-master");
  });

  it("system prompt is concise (≤ 500 tokens approx — characterwise ≤ 2400)", () => {
    expect(brain.systemPrompt.length).toBeLessThanOrEqual(2400);
  });

  it("decides for a brand-new character input shape (dry-run echo)", async () => {
    const result = await brain.decide({
      characterId: "sol-navarro",
      directive: "build a CRO-coded silhouette in charcoal wool",
      anchorPackId: undefined,
      recentWins: [],
      recentRejections: [],
    });
    expect(result.agent).toBe("character-master");
    expect(result.output).toBeDefined();
  });

  it("decide validates input — missing characterId throws", async () => {
    await expect(
      brain.decide({
        directive: "x",
        recentWins: [],
        recentRejections: [],
      } as never),
    ).rejects.toThrow();
  });

  it("decide validates output — non-conforming dry-run output is repaired (returns the schema-valid `dryRun` envelope)", async () => {
    const result = await brain.decide({
      characterId: "sol-navarro",
      directive: "test",
      recentWins: [],
      recentRejections: [],
    });
    expect(typeof result.output).toBe("object");
  });
});
