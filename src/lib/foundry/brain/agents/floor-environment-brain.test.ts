import { describe, expect, it } from "vitest";
import { createFloorEnvironmentBrain } from "./floor-environment-brain";

describe("floor-environment brain", () => {
  const brain = createFloorEnvironmentBrain({
    apiKey: "sk-fake",
    model: "claude-opus-4-7-test",
    dryRun: true,
  });

  it("reports its agent kind", () => {
    expect(brain.agent).toBe("floor-environment");
  });

  it("system prompt mentions day/night atmosphere variants", () => {
    expect(brain.systemPrompt).toMatch(/day|night|atmosphere/i);
  });

  it("decides for a war-room background request (dry-run)", async () => {
    const result = await brain.decide({
      space: "war-room",
      directive: "dusk version with brass column highlights",
      timeStates: ["dusk", "night"],
      recentWins: [],
      recentRejections: [],
    });
    expect(result.agent).toBe("floor-environment");
    expect(result.output).toBeDefined();
  });

  it("rejects unknown spaces at the schema layer", async () => {
    await expect(
      brain.decide({
        space: "moon-base" as never,
        directive: "x",
        timeStates: [],
        recentWins: [],
        recentRejections: [],
      }),
    ).rejects.toThrow();
  });
});
