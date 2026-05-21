import { describe, expect, it } from "vitest";
import {
  ARTLAB_TRANSITIONS,
  isLegalTransition,
  legalNextPhases,
} from "./machine";

describe("artlab state machine", () => {
  it("declares the 9 forward transitions in order", () => {
    const sequence = ARTLAB_TRANSITIONS
      .filter((t) => t.trigger === "auto" || t.trigger === "human")
      .map((t) => `${t.from}->${t.to}`);
    expect(sequence).toContain("routed->generating-concepts");
    expect(sequence).toContain("generating-concepts->concept-review");
    expect(sequence).toContain("concept-review->canary");
    expect(sequence).toContain("canary->production");
    expect(sequence).toContain("production->strict-qa");
    expect(sequence).toContain("strict-qa->final-review");
    expect(sequence).toContain("final-review->promoting");
    expect(sequence).toContain("promoting->verifying");
    expect(sequence).toContain("verifying->closed");
  });

  it("rejects illegal jumps", () => {
    expect(isLegalTransition("routed", "production")).toBe(false);
    expect(isLegalTransition("concept-review", "promoting")).toBe(false);
  });

  it("permits legal forward transitions", () => {
    expect(isLegalTransition("routed", "generating-concepts")).toBe(true);
    expect(isLegalTransition("canary", "production")).toBe(true);
  });

  it("legalNextPhases returns destinations", () => {
    expect(legalNextPhases("routed")).toContain("generating-concepts");
    expect(legalNextPhases("closed")).toEqual([]);
  });

  it("every non-closed phase has at least one outgoing transition", () => {
    const phases = ["routed", "generating-concepts", "concept-review", "canary", "production", "strict-qa", "final-review", "promoting", "verifying"] as const;
    for (const phase of phases) {
      expect(legalNextPhases(phase).length).toBeGreaterThan(0);
    }
  });
});
