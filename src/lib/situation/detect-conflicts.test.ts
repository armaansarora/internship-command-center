import { describe, it, expect } from "vitest";
import {
  detectConflicts,
  computePairId,
  type ConflictEvent,
} from "./detect-conflicts";

function iv(id: string, startH: number, endH: number): ConflictEvent {
  return {
    id,
    kind: "interview",
    title: `Interview ${id}`,
    startMs: startH * 3_600_000,
    endMs: endH * 3_600_000,
  };
}
function ce(id: string, startH: number, endH: number): ConflictEvent {
  return {
    id,
    kind: "calendar_event",
    title: `Event ${id}`,
    startMs: startH * 3_600_000,
    endMs: endH * 3_600_000,
  };
}

describe("detectConflicts", () => {
  it("empty input → []", () => {
    expect(detectConflicts([])).toEqual([]);
  });

  it("single event → []", () => {
    expect(detectConflicts([iv("a", 10, 11)])).toEqual([]);
  });

  it("non-overlapping adjacent events → []", () => {
    expect(
      detectConflicts([iv("a", 10, 11), iv("b", 11, 12)]),
    ).toEqual([]);
  });

  it("two overlapping interviews → 1 pair", () => {
    const result = detectConflicts([iv("a", 10, 12), iv("b", 11, 13)]);
    expect(result).toHaveLength(1);
    expect(result[0]!.a.id).toBe("a");
    expect(result[0]!.b.id).toBe("b");
  });

  it("interview overlapping calendar event → 1 pair", () => {
    const result = detectConflicts([iv("a", 10, 12), ce("x", 11, 13)]);
    expect(result).toHaveLength(1);
  });

  it("zero-duration event is excluded (can't overlap)", () => {
    const result = detectConflicts([iv("a", 10, 10), iv("b", 9, 11)]);
    expect(result).toEqual([]);
  });

  it("transitive overlaps A⊂B⊂C return 3 pair-level entries", () => {
    // A: 10-11, B: 9-12, C: 8-13 — A overlaps B, A overlaps C, B overlaps C.
    const result = detectConflicts([iv("a", 10, 11), iv("b", 9, 12), iv("c", 8, 13)]);
    expect(result).toHaveLength(3);
    const ids = result.map((p) => [p.a.id, p.b.id].sort().join(","));
    expect(new Set(ids)).toEqual(new Set(["a,b", "a,c", "b,c"]));
  });

  it("pairId is deterministic and order-insensitive", () => {
    const a = iv("first", 0, 1);
    const b = ce("second", 0, 1);
    expect(computePairId(a, b)).toBe(computePairId(b, a));
  });

  it("repeated pairs are deduplicated in output", () => {
    const a = iv("a", 10, 12);
    const b = iv("b", 11, 13);
    // Feed the same pair twice (unusual input, but detector should not duplicate).
    const result = detectConflicts([a, b, a, b]);
    expect(result).toHaveLength(1);
  });

  it("sort-based early-break: events far apart don't trigger inner loop", () => {
    // Sanity: 10 non-overlapping back-to-back events → 0 pairs.
    const events = Array.from({ length: 10 }, (_, i) => iv(`${i}`, i, i + 0.5));
    expect(detectConflicts(events)).toEqual([]);
  });

  it("endMs exactly equals next startMs → no overlap (half-open)", () => {
    const result = detectConflicts([iv("a", 10, 11), iv("b", 11, 12)]);
    expect(result).toEqual([]);
  });
});
