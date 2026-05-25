import { describe, expect, it } from "vitest";
import { validateDecisionOutput } from "./decision-schemas";

describe("validateDecisionOutput", () => {
  it("returns ok=true for kinds without a registered schema", () => {
    expect(validateDecisionOutput("clarification-wording", { x: 1 }).ok).toBe(true);
  });

  it("flags _parseError marker first (upstream parse failure)", () => {
    const result = validateDecisionOutput("compose-brief", { _parseError: "malformed-json", rawText: "blah" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/raw-text/);
  });

  it("accepts a valid compose-brief output", () => {
    const result = validateDecisionOutput("compose-brief", {
      identity: "Sol Navarro, warm relationship strategist",
      plannedVariation: ["younger", "mid-career", "engaged", "senior", "approachable"],
      referenceAnchor: "painterly luxury editorial",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects compose-brief with empty identity", () => {
    const result = validateDecisionOutput("compose-brief", {
      identity: "",
      plannedVariation: ["a", "b", "c", "d", "e"],
      referenceAnchor: "x",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/identity/);
  });

  it("rejects generate-concept-prompts with wrong lane count", () => {
    const result = validateDecisionOutput("generate-concept-prompts", {
      prompts: [
        { laneIndex: 1, prompt: "p1 enough content here", variationAxis: "axis" },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/prompts/);
  });

  it("accepts a valid critique-concept-board output", () => {
    const result = validateDecisionOutput("critique-concept-board", {
      summary: "Lane 3 lands strongest.",
      recommendedLane: 3,
      perLane: [
        { laneIndex: 1, critique: "ok" },
        { laneIndex: 2, critique: "ok" },
        { laneIndex: 3, critique: "ok" },
        { laneIndex: 4, critique: "ok" },
        { laneIndex: 5, critique: "ok" },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts critique-production-sprites with overallVerdict", () => {
    const result = validateDecisionOutput("critique-production-sprites", {
      overallVerdict: "tight",
      summary: "All 21 hold the lane identity.",
      flaggedSprites: [],
      approvedSpriteCount: 21,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects critique-production-sprites with invalid verdict", () => {
    const result = validateDecisionOutput("critique-production-sprites", {
      overallVerdict: "okayish",
      summary: "x",
      flaggedSprites: [],
      approvedSpriteCount: 21,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts answer-ask with references array", () => {
    const result = validateDecisionOutput("answer-ask", {
      text: "Sol's brass-green pairs against Otis's burgundy.",
      references: ["bible:cno", "bible:cmo"],
    });
    expect(result.ok).toBe(true);
  });
});
