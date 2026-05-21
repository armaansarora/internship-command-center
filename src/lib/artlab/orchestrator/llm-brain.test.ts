import { describe, expect, it } from "vitest";
import { decideWithMockBrain, ARTLAB_LLM_DECISION_KINDS } from "./llm-brain";

describe("LLM brain decision interface", () => {
  it("enumerates the 6 decision kinds", () => {
    expect(ARTLAB_LLM_DECISION_KINDS).toEqual([
      "route-ambiguous-brief",
      "clarification-wording",
      "concept-qa-adjudication",
      "reply-parser-fallback",
      "prompt-enrichment",
      "blocker-message-drafting",
    ]);
  });

  it("mock brain returns a structured route decision", async () => {
    const decision = await decideWithMockBrain({
      kind: "route-ambiguous-brief",
      input: { request: "make the loud one" },
    });
    expect(decision.kind).toBe("route-ambiguous-brief");
    expect(typeof decision.outputJson).toBe("object");
  });
});
