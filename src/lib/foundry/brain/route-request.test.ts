import { describe, expect, it } from "vitest";
import { routeFoundryRequest } from "./route-request";

describe("routeFoundryRequest", () => {
  it("returns a clarifying question when meta confidence is low", async () => {
    const result = await routeFoundryRequest("do the thing", {
      env: { ANTHROPIC_API_KEY: undefined },
      metaCallOverride: async () => ({
        text: JSON.stringify({ agent: "character-master", parsedArgs: {}, confidence: 0.4 }),
        tokensIn: 1, tokensOut: 1, durationMs: 0,
      }),
    });
    expect("needsClarification" in result ? result.needsClarification : false).toBe(true);
  });

  it("dispatches to the named brain with parsedArgs when confidence is high", async () => {
    const result = await routeFoundryRequest("make a War Room dusk", {
      env: { ANTHROPIC_API_KEY: undefined },
      metaCallOverride: async () => ({
        text: JSON.stringify({
          agent: "floor-environment",
          parsedArgs: { space: "war-room", directive: "dusk", timeStates: ["dusk"], recentWins: [], recentRejections: [] },
          confidence: 0.95,
        }),
        tokensIn: 1, tokensOut: 1, durationMs: 0,
      }),
    });
    expect("agent" in result && result.agent).toBe("floor-environment");
  });

  it("propagates meta-orchestrator errors (non-JSON) as typed Error", async () => {
    await expect(
      routeFoundryRequest("x", {
        env: {},
        metaCallOverride: async () => ({ text: "not json", tokensIn: 0, tokensOut: 0, durationMs: 0 }),
      }),
    ).rejects.toThrow(/meta-orchestrator/i);
  });
});
