import { describe, expect, it } from "vitest";
import {
  ARTLAB_TRANSITIONS,
  isLegalTransition,
  legalNextPhases,
} from "./machine";

describe("artlab state machine", () => {
  it("declares all forward transitions including brainstorm-mode phases", () => {
    const sequence = ARTLAB_TRANSITIONS
      .filter((t) => t.trigger === "auto" || t.trigger === "human")
      .map((t) => `${t.from}->${t.to}`);
    expect(sequence).toContain("routed->briefing");
    expect(sequence).toContain("briefing->brief-review");
    expect(sequence).toContain("brief-review->briefing");
    expect(sequence).toContain("brief-review->generating-concepts");
    expect(sequence).toContain("generating-concepts->concept-review");
    expect(sequence).toContain("concept-review->canary");
    expect(sequence).toContain("concept-review->refining-concepts");
    expect(sequence).toContain("refining-concepts->concept-review");
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
    expect(isLegalTransition("routed", "generating-concepts")).toBe(false); // must go through briefing now
  });

  it("permits legal forward transitions", () => {
    expect(isLegalTransition("routed", "briefing")).toBe(true);
    expect(isLegalTransition("brief-review", "generating-concepts")).toBe(true);
    expect(isLegalTransition("brief-review", "briefing")).toBe(true);
    expect(isLegalTransition("concept-review", "refining-concepts")).toBe(true);
    expect(isLegalTransition("refining-concepts", "concept-review")).toBe(true);
    expect(isLegalTransition("canary", "production")).toBe(true);
  });

  it("legalNextPhases returns destinations", () => {
    expect(legalNextPhases("routed")).toContain("briefing");
    expect(legalNextPhases("brief-review")).toEqual(expect.arrayContaining(["briefing", "generating-concepts"]));
    expect(legalNextPhases("concept-review")).toEqual(expect.arrayContaining(["canary", "refining-concepts"]));
    expect(legalNextPhases("closed")).toEqual([]);
  });

  it("every non-closed phase has at least one outgoing transition", () => {
    const phases = ["routed", "briefing", "brief-review", "generating-concepts", "concept-review", "refining-concepts", "canary", "production", "strict-qa", "final-review", "promoting", "verifying"] as const;
    for (const phase of phases) {
      expect(legalNextPhases(phase).length).toBeGreaterThan(0);
    }
  });

  it("supports entering any phase's blocker without changing phase", () => {
    for (const phase of ["routed", "canary", "production"] as const) {
      expect(isLegalTransition(phase, phase, "needs-human")).toBe(true);
      expect(isLegalTransition(phase, phase, "provider-blocked")).toBe(true);
    }
  });

  it("supports cancellation from any non-terminal phase", () => {
    expect(isLegalTransition("canary", "canary", "cancelled")).toBe(true);
    expect(isLegalTransition("closed", "closed", "cancelled")).toBe(false);
  });
});
