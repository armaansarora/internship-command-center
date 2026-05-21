import { describe, expect, it } from "vitest";
import { parseReplyExact, REQUIRED_PROMOTION_PHRASE, parseReplyPattern, parseReply } from "./reply-parser";
import type { ArtLabLlmBrain } from "../orchestrator/llm-brain";

const mockBrainHighConf: ArtLabLlmBrain = {
  async decide() {
    return {
      kind: "reply-parser-fallback",
      outputJson: { action: "approve-direction", laneIndex: 4 },
      confidence: 0.92, tokensIn: 50, tokensOut: 12, model: "claude-opus-4-7",
    };
  },
};

const mockBrainLowConf: ArtLabLlmBrain = {
  async decide() {
    return {
      kind: "reply-parser-fallback",
      outputJson: { action: "approve-direction", laneIndex: 1 },
      confidence: 0.5, tokensIn: 0, tokensOut: 0, model: "claude-opus-4-7",
    };
  },
};

describe("reply parser — tier 1 exact", () => {
  it("phrase is the canonical literal", () => {
    expect(REQUIRED_PROMOTION_PHRASE).toBe("approved for app");
  });

  it("accepts the exact phrase case-insensitively, trimmed", () => {
    expect(parseReplyExact("approved for app")).toEqual({ kind: "promotion-accepted" });
    expect(parseReplyExact("  Approved For App  ")).toEqual({ kind: "promotion-accepted" });
    expect(parseReplyExact("APPROVED FOR APP")).toEqual({ kind: "promotion-accepted" });
  });

  it("echoes back the required phrase on near-misses", () => {
    expect(parseReplyExact("approve for app")).toMatchObject({ kind: "echo-back-required-phrase" });
    expect(parseReplyExact("approved for the app")).toMatchObject({ kind: "echo-back-required-phrase" });
  });

  it("returns no-match for unrelated text", () => {
    expect(parseReplyExact("approve direction 3")).toEqual({ kind: "no-match" });
    expect(parseReplyExact("hello")).toEqual({ kind: "no-match" });
  });
});

describe("reply parser — tier 2 pattern", () => {
  it("parses 'approve direction 3' as approve-direction action", () => {
    expect(parseReplyPattern("approve direction 3")).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 3 },
    });
  });

  it("tolerates whitespace and casing", () => {
    expect(parseReplyPattern("  Approve  Direction  2  ")).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 2 },
    });
  });

  it("parses 'revise: make her older' as revise action", () => {
    expect(parseReplyPattern("revise: make her older")).toEqual({
      kind: "matched", action: { type: "revise", text: "make her older" },
    });
  });

  it("parses 'reject' and 'archive' as reject action", () => {
    expect(parseReplyPattern("reject")).toEqual({ kind: "matched", action: { type: "reject" } });
    expect(parseReplyPattern("archive")).toEqual({ kind: "matched", action: { type: "reject" } });
  });

  it("parses 'cancel <runId>' as cancel action", () => {
    expect(parseReplyPattern("cancel run-abc-123")).toEqual({
      kind: "matched", action: { type: "cancel", runId: "run-abc-123" },
    });
  });

  it("returns no-match on unrelated text", () => {
    expect(parseReplyPattern("hello")).toEqual({ kind: "no-match" });
  });
});

describe("reply parser — composed cascade", () => {
  it("tier 1 short-circuits — brain not called", async () => {
    let called = false;
    const brain: ArtLabLlmBrain = {
      async decide(...a) { called = true; return mockBrainHighConf.decide(...a); },
    };
    expect(await parseReply("approved for app", brain)).toEqual({ kind: "promotion-accepted" });
    expect(called).toBe(false);
  });

  it("tier 2 short-circuits — brain not called", async () => {
    let called = false;
    const brain: ArtLabLlmBrain = {
      async decide(...a) { called = true; return mockBrainHighConf.decide(...a); },
    };
    expect(await parseReply("approve direction 1", brain)).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 1 },
    });
    expect(called).toBe(false);
  });

  it("tier 3 brain matches ambiguous text with high confidence", async () => {
    expect(await parseReply("lane four please", mockBrainHighConf)).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 4 },
    });
  });

  it("needs-clarification when brain confidence < 0.7", async () => {
    expect(await parseReply("idk maybe", mockBrainLowConf)).toEqual({
      kind: "needs-clarification", text: "idk maybe",
    });
  });
});
