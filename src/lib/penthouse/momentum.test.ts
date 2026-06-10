import { describe, expect, it } from "vitest";
import { classifyDirection, computeMomentum, type SnapshotPoint } from "./momentum";

function point(date: string, overrides: Partial<SnapshotPoint> = {}): SnapshotPoint {
  return {
    date,
    totalApplications: 10,
    activePipeline: 5,
    appliedCount: 4,
    interviewCount: 1,
    offerCount: 0,
    staleCount: 0,
    ...overrides,
  };
}

describe("classifyDirection", () => {
  it("any forward motion reads rising", () => {
    expect(classifyDirection(1, 0)).toBe("rising");
    expect(classifyDirection(0, 1)).toBe("rising");
    expect(classifyDirection(-2, 1)).toBe("rising"); // interviews trump shrinkage
  });

  it("pure shrinkage reads cooling; no motion reads steady", () => {
    expect(classifyDirection(-1, 0)).toBe("cooling");
    expect(classifyDirection(-1, -1)).toBe("cooling");
    expect(classifyDirection(0, 0)).toBe("steady");
    expect(classifyDirection(0, -1)).toBe("steady");
  });
});

describe("computeMomentum", () => {
  it("returns the empty state for zero rows", () => {
    const m = computeMomentum([]);
    expect(m.hasEnoughData).toBe(false);
    expect(m.points).toHaveLength(0);
    expect(m.direction).toBe("steady");
  });

  it("one row is not enough data but keeps the point for copy", () => {
    const m = computeMomentum([point("2026-06-09")]);
    expect(m.hasEnoughData).toBe(false);
    expect(m.points).toHaveLength(1);
    expect(m.firstDate).toBe("2026-06-09");
  });

  it("computes window deltas from first to last, ascending", () => {
    const m = computeMomentum([
      point("2026-06-07", { totalApplications: 10, activePipeline: 5, interviewCount: 1 }),
      point("2026-06-09", { totalApplications: 15, activePipeline: 8, interviewCount: 3 }),
      point("2026-06-08", { totalApplications: 12, activePipeline: 6, interviewCount: 1 }),
    ]);
    expect(m.hasEnoughData).toBe(true);
    expect(m.points.map((p) => p.date)).toEqual(["2026-06-07", "2026-06-08", "2026-06-09"]);
    expect(m.appsAdded).toBe(5);
    expect(m.pipelineDelta).toBe(3);
    expect(m.interviewDelta).toBe(2);
    expect(m.direction).toBe("rising");
    expect(m.firstDate).toBe("2026-06-07");
    expect(m.lastDate).toBe("2026-06-09");
  });

  it("dedupes same-date rows, last write wins", () => {
    const m = computeMomentum([
      point("2026-06-08", { activePipeline: 4 }),
      point("2026-06-08", { activePipeline: 9 }),
      point("2026-06-09", { activePipeline: 9 }),
    ]);
    expect(m.points).toHaveLength(2);
    expect(m.points[0].activePipeline).toBe(9);
    expect(m.pipelineDelta).toBe(0);
    expect(m.direction).toBe("steady");
  });

  it("clamps appsAdded at zero and reads shrinkage as cooling", () => {
    const m = computeMomentum([
      point("2026-06-07", { totalApplications: 20, activePipeline: 9, interviewCount: 2 }),
      point("2026-06-09", { totalApplications: 18, activePipeline: 4, interviewCount: 2 }),
    ]);
    expect(m.appsAdded).toBe(0);
    expect(m.pipelineDelta).toBe(-5);
    expect(m.direction).toBe("cooling");
  });
});
