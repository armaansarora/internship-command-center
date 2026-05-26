import { describe, expect, it } from "vitest";
import {
  ARTLAB_AGENT_KINDS,
  ArtLabAgentBrainResultSchema,
  ArtLabMetaIntentSchema,
} from "./types";

describe("artlab sdk brain shared types", () => {
  it("ARTLAB_AGENT_KINDS lists every specialist agent", () => {
    expect(ARTLAB_AGENT_KINDS).toEqual([
      "character-master",
      "floor-environment",
      "ui-texture",
      "sprite-animator",
    ]);
  });

  it("ArtLabMetaIntentSchema rejects unknown agent strings", () => {
    expect(() =>
      ArtLabMetaIntentSchema.parse({ agent: "phantom", parsedArgs: {}, confidence: 0.9 }),
    ).toThrow();
  });

  it("ArtLabMetaIntentSchema enforces confidence in [0, 1]", () => {
    expect(() =>
      ArtLabMetaIntentSchema.parse({ agent: "character-master", parsedArgs: {}, confidence: 1.4 }),
    ).toThrow();
    expect(() =>
      ArtLabMetaIntentSchema.parse({ agent: "character-master", parsedArgs: {}, confidence: -0.1 }),
    ).toThrow();
  });

  it("ArtLabAgentBrainResult requires durationMs and tokens", () => {
    const ok = ArtLabAgentBrainResultSchema.parse({
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
