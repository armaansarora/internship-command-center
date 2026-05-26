import { describe, expect, it } from "vitest";
import {
  FOUNDRY_AGENT_KINDS,
  FoundryAgentBrainResultSchema,
  FoundryMetaIntentSchema,
} from "./types";

describe("foundry brain shared types", () => {
  it("FOUNDRY_AGENT_KINDS lists every specialist agent", () => {
    expect(FOUNDRY_AGENT_KINDS).toEqual([
      "character-master",
      "floor-environment",
      "ui-texture",
      "sprite-animator",
    ]);
  });

  it("FoundryMetaIntentSchema rejects unknown agent strings", () => {
    expect(() =>
      FoundryMetaIntentSchema.parse({ agent: "phantom", parsedArgs: {}, confidence: 0.9 }),
    ).toThrow();
  });

  it("FoundryMetaIntentSchema enforces confidence in [0, 1]", () => {
    expect(() =>
      FoundryMetaIntentSchema.parse({ agent: "character-master", parsedArgs: {}, confidence: 1.4 }),
    ).toThrow();
    expect(() =>
      FoundryMetaIntentSchema.parse({ agent: "character-master", parsedArgs: {}, confidence: -0.1 }),
    ).toThrow();
  });

  it("FoundryAgentBrainResult requires durationMs and tokens", () => {
    const ok = FoundryAgentBrainResultSchema.parse({
      agent: "floor-environment",
      output: { plan: "x" },
      tokensIn: 100,
      tokensOut: 50,
      model: "claude-opus-4-7",
      durationMs: 1234,
    });
    expect(ok.agent).toBe("floor-environment");
  });
});
