import { describe, expect, it } from "vitest";
import { resolveArtLabIntent } from "./meta-orchestrator";

const fakeIntentBrain = (canned: Record<string, unknown>) => async () => ({
  text: JSON.stringify(canned),
  tokensIn: 10,
  tokensOut: 20,
  durationMs: 10,
});

describe("resolveArtLabIntent", () => {
  it("returns a typed intent when the brain reply is well-formed and confidence >= 0.7", async () => {
    const result = await resolveArtLabIntent("make a new war-room dusk background", {
      apiKey: "sk-fake",
      model: "test",
      callOverride: fakeIntentBrain({
        agent: "floor-environment",
        parsedArgs: { space: "war-room", directive: "dusk" },
        confidence: 0.9,
      }),
    });
    expect("agent" in result ? result.agent : null).toBe("floor-environment");
  });

  it("returns a clarifying question when confidence < 0.7", async () => {
    const result = await resolveArtLabIntent("do the thing", {
      apiKey: "sk-fake",
      model: "test",
      callOverride: fakeIntentBrain({
        agent: "character-master",
        parsedArgs: {},
        confidence: 0.5,
      }),
    });
    expect("needsClarification" in result ? result.needsClarification : false).toBe(true);
  });

  it("returns a typed error when the brain returns non-JSON", async () => {
    await expect(
      resolveArtLabIntent("x", {
        apiKey: "sk-fake",
        model: "test",
        callOverride: async () => ({ text: "not json", tokensIn: 0, tokensOut: 0, durationMs: 0 }),
      }),
    ).rejects.toThrow(/meta-orchestrator/i);
  });

  it("routes 'icon for the elevator chevron' → ui-texture or character-master is acceptable; rejects ghost agent strings", async () => {
    await expect(
      resolveArtLabIntent("anything", {
        apiKey: "sk-fake",
        model: "test",
        callOverride: fakeIntentBrain({ agent: "phantom", parsedArgs: {}, confidence: 0.9 }),
      }),
    ).rejects.toThrow();
  });
});
