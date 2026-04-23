import { describe, it, expect } from "vitest";
import { nextInterrupt, type DrillState } from "./interrupt-rules";

function baseState(overrides: Partial<DrillState> = {}): DrillState {
  return {
    elapsedMs: 0,
    lastInterruptAtMs: null,
    firmness: "firm",
    isFirstQuestion: false,
    wordCount: 0,
    stars: { s: 0, t: 0, a: 0, r: 0 },
    ...overrides,
  };
}

describe("interrupt-rules", () => {
  it("returns null when elapsed < 15s on first question", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 10_000, isFirstQuestion: true, wordCount: 60, stars: { s: 40, t: 0, a: 0, r: 0 } }));
    expect(r).toBeNull();
  });

  it("fires no_action_verb when 40+ words, no Action column fill", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 35_000, wordCount: 50, stars: { s: 30, t: 30, a: 0, r: 0 } }));
    expect(r?.type).toBe("no_action_verb");
  });

  it("fires too_much_situation or no_action_verb when Situation fills but Task/Action don't after 30s", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 35_000, wordCount: 80, stars: { s: 80, t: 0, a: 0, r: 0 } }));
    expect(["too_much_situation", "no_action_verb"]).toContain(r?.type);
  });

  it("fires no_result when Action fills but Result doesn't after 60s", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 65_000, wordCount: 150, stars: { s: 60, t: 50, a: 70, r: 0 } }));
    expect(r?.type).toBe("no_result");
  });

  it("fires wrapping_up at 90s timer", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 95_000, wordCount: 180, stars: { s: 60, t: 50, a: 70, r: 50 } }));
    expect(r?.type).toBe("wrapping_up");
  });

  it("fires over_time past 120s", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 125_000, wordCount: 220 }));
    expect(r?.type).toBe("over_time");
  });

  it("respects 20s cooldown", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 35_000, lastInterruptAtMs: 30_000, wordCount: 60, stars: { s: 30, t: 0, a: 0, r: 0 } }));
    expect(r).toBeNull();
  });

  it("cooldown expires after 20s", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 51_000, lastInterruptAtMs: 30_000, wordCount: 60, stars: { s: 30, t: 0, a: 0, r: 0 } }));
    expect(r?.type).toBe("no_action_verb");
  });

  it("gentle firmness waits ~1.5× longer", () => {
    const s = baseState({ elapsedMs: 30_000, wordCount: 50, firmness: "gentle", stars: { s: 30, t: 0, a: 0, r: 0 } });
    expect(nextInterrupt(s)).toBeNull();
    expect(nextInterrupt({ ...s, elapsedMs: 50_000 })?.type).toBe("no_action_verb");
  });

  it("hardass firmness fires faster", () => {
    const s = baseState({ elapsedMs: 20_000, wordCount: 30, firmness: "hardass", stars: { s: 20, t: 0, a: 0, r: 0 } });
    expect(nextInterrupt(s)?.type).toBe("no_action_verb");
  });

  it("first-question grace only applies before 15s", () => {
    const s = baseState({ elapsedMs: 14_000, isFirstQuestion: true, wordCount: 50, stars: { s: 40, t: 0, a: 0, r: 0 } });
    expect(nextInterrupt(s)).toBeNull();
    expect(nextInterrupt({ ...s, elapsedMs: 16_000 })).not.toBeNull();
  });

  it("non-first-question has no grace", () => {
    const r = nextInterrupt(baseState({ elapsedMs: 12_000, isFirstQuestion: false, wordCount: 50, stars: { s: 40, t: 0, a: 0, r: 0 } }));
    // 12s too early even for non-first — the 30s floor should still hold
    expect(r).toBeNull();
  });

  it("prompt strings are non-empty for every type", () => {
    const types: Array<DrillState> = [
      baseState({ elapsedMs: 35_000, wordCount: 50, stars: { s: 30, t: 0, a: 0, r: 0 } }),
      baseState({ elapsedMs: 95_000, wordCount: 180, stars: { s: 60, t: 50, a: 70, r: 50 } }),
      baseState({ elapsedMs: 125_000, wordCount: 220 }),
      baseState({ elapsedMs: 65_000, wordCount: 150, stars: { s: 60, t: 50, a: 70, r: 0 } }),
    ];
    for (const s of types) {
      const r = nextInterrupt(s);
      if (r) expect(r.prompt.length).toBeGreaterThan(0);
    }
  });
});
