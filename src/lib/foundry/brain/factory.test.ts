import { describe, expect, it } from "vitest";
import { createFoundryBrainFor } from "./factory";

describe("createFoundryBrainFor", () => {
  it("returns the character-master brain", () => {
    const brain = createFoundryBrainFor("character-master", { ANTHROPIC_API_KEY: undefined });
    expect(brain.agent).toBe("character-master");
  });

  it("returns the floor-environment brain", () => {
    const brain = createFoundryBrainFor("floor-environment", { ANTHROPIC_API_KEY: undefined });
    expect(brain.agent).toBe("floor-environment");
  });

  it("returns the ui-texture brain", () => {
    const brain = createFoundryBrainFor("ui-texture", { ANTHROPIC_API_KEY: undefined });
    expect(brain.agent).toBe("ui-texture");
  });

  it("returns the sprite-animator brain", () => {
    const brain = createFoundryBrainFor("sprite-animator", { ANTHROPIC_API_KEY: undefined });
    expect(brain.agent).toBe("sprite-animator");
  });

  it("throws for an unknown kind at runtime", () => {
    expect(() => createFoundryBrainFor("phantom" as never, {})).toThrow();
  });

  it("brains created without an API key run in dryRun mode (decide() does not hit the network)", async () => {
    const brain = createFoundryBrainFor("character-master", { ANTHROPIC_API_KEY: undefined });
    const result = await brain.decide({
      characterId: "rafe-calder",
      directive: "smoke test",
      recentWins: [],
      recentRejections: [],
    });
    expect(result.tokensIn).toBe(0);
    expect(result.tokensOut).toBe(0);
  });
});
