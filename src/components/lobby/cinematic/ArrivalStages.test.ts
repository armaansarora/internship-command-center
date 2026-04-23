import { describe, it, expect } from "vitest";

import {
  STAGES,
  reducedMotionStages,
  totalDurationMs,
  type ArrivalStage,
} from "./ArrivalStages";

/**
 * R4.7 — pure stage-definition tests for the CinematicArrival.
 *
 * The cinematic is composed of a small, fixed sequence of named stages.
 * Keeping them in a pure data module means we can assert timing, ordering,
 * and the reduced-motion collapse without mounting the DOM, and the
 * component itself stays a thin GSAP runner over the same data.
 *
 * Contract locked here:
 *  - STAGES is a readonly array of `{ id, label, durationMs, easing }`.
 *  - The total of all durationMs values is ≤ 8000 (the design-doc cap).
 *  - The sequence is deterministic: same ids, same order, every run.
 *  - reducedMotionStages() collapses the entire sequence to ONE zero-duration
 *    stage so the cinematic runs to completion instantly for that audience.
 */

describe("ArrivalStages — STAGES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(STAGES)).toBe(true);
    expect(STAGES.length).toBeGreaterThan(0);
  });

  it("has between 4 and 6 stages (per the R4.7 design brief)", () => {
    expect(STAGES.length).toBeGreaterThanOrEqual(4);
    expect(STAGES.length).toBeLessThanOrEqual(6);
  });

  it("every stage has the required fields with sensible types", () => {
    for (const stage of STAGES) {
      expect(typeof stage.id).toBe("string");
      expect(stage.id.length).toBeGreaterThan(0);
      expect(typeof stage.label).toBe("string");
      expect(typeof stage.durationMs).toBe("number");
      expect(Number.isFinite(stage.durationMs)).toBe(true);
      expect(stage.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof stage.easing).toBe("string");
      expect(stage.easing.length).toBeGreaterThan(0);
    }
  });

  it("has unique ids across the sequence", () => {
    const ids = STAGES.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("totals ≤ 8000ms across all stages (design doc §1.1 cap)", () => {
    expect(totalDurationMs(STAGES)).toBeLessThanOrEqual(8000);
  });

  it("totals > 0 (we still play something for the motion audience)", () => {
    expect(totalDurationMs(STAGES)).toBeGreaterThan(0);
  });

  it("includes the four arc beats suggested by the design (approach, pan-down, lobby-fade-in, concierge-land)", () => {
    // These ids are part of the contract — downstream tests and CSS selectors
    // key off them. If we want to rename them, we change this test consciously.
    const ids = STAGES.map((s) => s.id);
    expect(ids).toContain("approach");
    expect(ids).toContain("pan-down");
    expect(ids).toContain("lobby-fade-in");
    expect(ids).toContain("concierge-land");
  });

  it("orders the beats as aerial-approach → skyline-pan → reception-interior → desk", () => {
    // The arc is narrative: exterior → interior. If we ever reorder, this
    // test reminds us why the current order matters.
    const ids = STAGES.map((s) => s.id);
    const approachIdx = ids.indexOf("approach");
    const panIdx = ids.indexOf("pan-down");
    const lobbyIdx = ids.indexOf("lobby-fade-in");
    const conciergeIdx = ids.indexOf("concierge-land");

    expect(approachIdx).toBeLessThan(panIdx);
    expect(panIdx).toBeLessThan(lobbyIdx);
    expect(lobbyIdx).toBeLessThan(conciergeIdx);
  });

  it("does not use cheap bounces / elastic easings (motion-sickness discipline)", () => {
    for (const stage of STAGES) {
      const lower = stage.easing.toLowerCase();
      expect(lower).not.toContain("bounce");
      expect(lower).not.toContain("elastic");
      expect(lower).not.toContain("back.in");
    }
  });
});

describe("ArrivalStages — totalDurationMs", () => {
  it("returns 0 for an empty array", () => {
    expect(totalDurationMs([])).toBe(0);
  });

  it("sums straightforward cases", () => {
    const stages: ArrivalStage[] = [
      { id: "a", label: "A", durationMs: 1000, easing: "linear" },
      { id: "b", label: "B", durationMs: 500, easing: "linear" },
      { id: "c", label: "C", durationMs: 250, easing: "linear" },
    ];
    expect(totalDurationMs(stages)).toBe(1750);
  });
});

describe("ArrivalStages — reducedMotionStages", () => {
  it("returns exactly one stage", () => {
    expect(reducedMotionStages()).toHaveLength(1);
  });

  it("the single stage has a zero duration", () => {
    const [stage] = reducedMotionStages();
    expect(stage.durationMs).toBe(0);
  });

  it("uses the canonical id 'collapsed' so tests / tooling can detect the reduced path", () => {
    const [stage] = reducedMotionStages();
    expect(stage.id).toBe("collapsed");
  });

  it("the label is empty (nothing user-facing to announce on reduced motion)", () => {
    const [stage] = reducedMotionStages();
    expect(stage.label).toBe("");
  });

  it("uses 'none' as the easing (no motion at all)", () => {
    const [stage] = reducedMotionStages();
    expect(stage.easing).toBe("none");
  });

  it("the total duration of the reduced-motion sequence is zero", () => {
    expect(totalDurationMs(reducedMotionStages())).toBe(0);
  });

  it("returns a fresh array on every call (no shared mutable state)", () => {
    const a = reducedMotionStages();
    const b = reducedMotionStages();
    expect(a).not.toBe(b); // not the same reference
    expect(a).toEqual(b);  // but structurally identical
  });
});
