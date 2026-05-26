import { describe, expect, it } from "vitest";
import { createUiTextureBrain } from "./ui-texture-brain";

describe("ui-texture brain", () => {
  const brain = createUiTextureBrain({
    apiKey: "sk-fake",
    model: "claude-opus-4-7-test",
    dryRun: true,
  });

  it("reports its agent kind", () => {
    expect(brain.agent).toBe("ui-texture");
  });

  it("system prompt mentions tileability / CSS variable naming", () => {
    expect(brain.systemPrompt).toMatch(/tile|css|variable/i);
  });

  it("decides for a button texture request", async () => {
    const result = await brain.decide({
      slotId: "tower.button.bg",
      directive: "soft brass gradient with subtle grain",
      tileable: true,
      paletteHints: ["#C9A84C", "#1A1A2E"],
      recentWins: [],
      recentRejections: [],
    });
    expect(result.agent).toBe("ui-texture");
    expect(result.output).toBeDefined();
  });

  it("rejects requests without a slotId", async () => {
    await expect(
      brain.decide({ directive: "x", tileable: true, paletteHints: [], recentWins: [], recentRejections: [] } as never),
    ).rejects.toThrow();
  });
});
