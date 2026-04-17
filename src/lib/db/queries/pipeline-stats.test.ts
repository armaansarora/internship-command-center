import { describe, it, expect } from "vitest";
import { buildPipelineStatsFromAggregates } from "./pipeline-stats-from-aggregates";

describe("buildPipelineStatsFromAggregates", () => {
  it("computes rates from status counts", () => {
    const stats = buildPipelineStatsFromAggregates(
      {
        discovered: 5,
        applied: 10,
        screening: 4,
        interview_scheduled: 1,
        interviewing: 1,
        offer: 1,
      },
      20,
      2,
      1,
      8
    );
    expect(stats.applied).toBe(10);
    expect(stats.interviewing).toBe(2);
    expect(stats.offers).toBe(1);
    expect(stats.conversionLabel).toMatch(/^\d+%$/);
  });
});
