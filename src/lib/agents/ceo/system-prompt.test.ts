import { describe, it, expect } from "vitest";
import { buildCEOSystemPrompt } from "./system-prompt";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";

const STATS: PipelineStats = {
  total: 10,
  discovered: 0,
  applied: 5,
  screening: 3,
  interviewing: 1,
  offers: 1,
  stale: 2,
  weeklyActivity: 7,
  conversionRate: 12,
  scheduledInterviews: 1,
  byStatus: { applied: 5, screening: 3, interviewing: 1, offer: 1 },
  appliedToScreeningRate: 60,
  screeningToInterviewRate: 33.3,
  interviewToOfferRate: 100,
  staleCount: 2,
  warmCount: 1,
  conversionLabel: "12%",
};

describe("buildCEOSystemPrompt", () => {
  it("includes the TOOL USAGE guidance block for dispatchBatch vs single dispatch", () => {
    const prompt = buildCEOSystemPrompt(STATS, "Armaan", [], []);
    expect(prompt).toContain("TOOL USAGE");
    expect(prompt).toContain("dispatchBatch");
    expect(prompt).toContain("parallel");
  });

  it("spells out omnibus-triggers that should use dispatchBatch", () => {
    const prompt = buildCEOSystemPrompt(STATS, "Armaan", [], []);
    // Each of the signal phrases the CEO should recognize as a batch trigger.
    expect(prompt).toContain("morning briefing");
    expect(prompt).toContain("how's everything looking");
  });

  it("gives a concrete multi-agent example", () => {
    const prompt = buildCEOSystemPrompt(STATS, "Armaan", [], []);
    expect(prompt).toMatch(/dispatchBatch\(\{\s*tasks:/);
  });

  it("instructs to use single-agent dispatchToX for focused asks", () => {
    const prompt = buildCEOSystemPrompt(STATS, "Armaan", [], []);
    expect(prompt).toContain("dispatchToCMO");
    expect(prompt).toMatch(/do\s*not\s*wrap/i);
  });

  it("still renders the dynamic pipeline overview (layer 3 regression guard)", () => {
    const prompt = buildCEOSystemPrompt(STATS, "Armaan", [], []);
    expect(prompt).toContain("Total active ops: 10");
    expect(prompt).toContain("USER: Armaan");
  });
});
