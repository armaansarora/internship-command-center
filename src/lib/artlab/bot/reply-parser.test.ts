import { describe, expect, it } from "vitest";
import { parseReplyExact, REQUIRED_PROMOTION_PHRASE, parseReplyPattern } from "./reply-parser";

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
