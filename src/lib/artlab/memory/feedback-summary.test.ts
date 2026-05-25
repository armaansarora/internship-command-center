import { describe, expect, it } from "vitest";
import { summariseFeedbackForBrain } from "./feedback-summary";
import type { StyleWinEntry } from "./style-ledger";
import type { RejectionEntry } from "./rejection-ledger";

function win(at: string, techniques: string[]): StyleWinEntry {
  return {
    characterId: "cno",
    promotedAt: at,
    winningTechniques: techniques,
    promptHash: "abc123",
    totalCostCents: 100,
  };
}

function rejection(at: string, reason: string, codes: string[] = []): RejectionEntry {
  return {
    characterId: "cno",
    runId: "r1",
    lane: 1,
    rejectedAt: at,
    reason,
    qaFailureCodes: codes,
    promptHashRejected: "xyz789",
  };
}

describe("summariseFeedbackForBrain", () => {
  it("returns empty arrays when no entries", () => {
    const result = summariseFeedbackForBrain([], []);
    expect(result.recentWins).toEqual([]);
    expect(result.recentRejections).toEqual([]);
    expect(result.winsCount).toBe(0);
    expect(result.rejectionsCount).toBe(0);
  });

  it("takes the most recent 3 wins (newest first)", () => {
    const wins = [
      win("2026-01-01T00:00:00.000Z", ["oldest"]),
      win("2026-02-01T00:00:00.000Z", ["middle"]),
      win("2026-03-01T00:00:00.000Z", ["newer"]),
      win("2026-04-01T00:00:00.000Z", ["newest"]),
      win("2026-05-01T00:00:00.000Z", ["very-newest"]),
    ];
    const r = summariseFeedbackForBrain(wins, []);
    expect(r.recentWins).toHaveLength(3);
    expect(r.recentWins[0]!.techniques).toBe("very-newest");
    expect(r.recentWins[2]!.techniques).toBe("newer");
    expect(r.winsCount).toBe(5);
  });

  it("formats win dates as YYYY-MM-DD only", () => {
    const r = summariseFeedbackForBrain([win("2026-05-25T22:30:00.000Z", ["brass-green"])], []);
    expect(r.recentWins[0]!.at).toBe("2026-05-25");
  });

  it("joins techniques with a comma", () => {
    const r = summariseFeedbackForBrain([win("2026-05-01T00:00:00Z", ["a", "b", "c"])], []);
    expect(r.recentWins[0]!.techniques).toBe("a, b, c");
  });

  it("truncates very long technique strings to ≤ 50 chars", () => {
    const long = "a".repeat(200);
    const r = summariseFeedbackForBrain([win("2026-05-01T00:00:00Z", [long])], []);
    expect(r.recentWins[0]!.techniques.length).toBeLessThanOrEqual(50);
    expect(r.recentWins[0]!.techniques.endsWith("…")).toBe(true);
  });

  it("summarises rejections with reason + codes", () => {
    const rejections = [
      rejection("2026-05-25T00:00:00Z", "style drift on lane 3", ["style-failed"]),
      rejection("2026-05-26T00:00:00Z", "noisy backdrop", ["noisy-backdrop"]),
    ];
    const r = summariseFeedbackForBrain([], rejections);
    expect(r.recentRejections).toHaveLength(2);
    expect(r.recentRejections[0]!.reason).toBe("noisy backdrop");
    expect(r.recentRejections[0]!.codes).toBe("noisy-backdrop");
    expect(r.rejectionsCount).toBe(2);
  });

  it("respects custom topN", () => {
    const wins = [
      win("2026-01-01T00:00:00Z", ["a"]),
      win("2026-02-01T00:00:00Z", ["b"]),
      win("2026-03-01T00:00:00Z", ["c"]),
    ];
    const r = summariseFeedbackForBrain(wins, [], 1);
    expect(r.recentWins).toHaveLength(1);
    expect(r.recentWins[0]!.techniques).toBe("c");
    expect(r.winsCount).toBe(3);
  });
});
