import { describe, it, expect } from "vitest";
import { CroResultData, CroTools } from "@/contracts/departments/cro";

describe("CroResultData", () => {
  it("parses valid pipeline snapshot", () => {
    const result = CroResultData.parse({
      pipelineSnapshot: {
        total: 10,
        byStatus: { applied: 5, screening: 3, offer: 2 },
        byTier: { "1": 4, "2": 6 },
      },
      actionItems: [
        {
          applicationId: "app-1",
          company: "Stripe",
          role: "SWE Intern",
          action: "Follow up",
          urgency: "high",
        },
      ],
    });
    expect(result.pipelineSnapshot.total).toBe(10);
    expect(result.actionItems).toHaveLength(1);
  });

  it("defaults optional arrays", () => {
    const result = CroResultData.parse({
      pipelineSnapshot: {
        total: 0,
        byStatus: {},
        byTier: {},
      },
      actionItems: [],
    });
    expect(result.newOpportunities).toEqual([]);
    expect(result.statusChanges).toEqual([]);
  });
});

describe("CroTools - searchJobs", () => {
  it("has correct description literal", () => {
    const parsed = CroTools.searchJobs.shape.description.parse(
      "Search for internship job listings using JSearch API"
    );
    expect(parsed).toBe(
      "Search for internship job listings using JSearch API"
    );
  });

  it("defaults datePosted to week", () => {
    const parsed = CroTools.searchJobs.shape.parameters.parse({
      query: "software intern",
    });
    expect(parsed.datePosted).toBe("week");
  });

  it("defaults remoteOnly to false", () => {
    const parsed = CroTools.searchJobs.shape.parameters.parse({
      query: "data science intern",
    });
    expect(parsed.remoteOnly).toBe(false);
  });

  it("defaults limit to 10", () => {
    const parsed = CroTools.searchJobs.shape.parameters.parse({
      query: "intern",
    });
    expect(parsed.limit).toBe(10);
  });

  it("requires query", () => {
    expect(() =>
      CroTools.searchJobs.shape.parameters.parse({})
    ).toThrow();
  });
});

describe("CroTools - lookupAtsJob", () => {
  it("has correct description literal", () => {
    const parsed = CroTools.lookupAtsJob.shape.description.parse(
      "Look up a specific job on Lever or Greenhouse ATS"
    );
    expect(parsed).toBe(
      "Look up a specific job on Lever or Greenhouse ATS"
    );
  });

  it("requires company and atsType", () => {
    expect(() =>
      CroTools.lookupAtsJob.shape.parameters.parse({})
    ).toThrow();

    expect(() =>
      CroTools.lookupAtsJob.shape.parameters.parse({ company: "Acme" })
    ).toThrow();
  });

  it("accepts lever as atsType", () => {
    const parsed = CroTools.lookupAtsJob.shape.parameters.parse({
      company: "Stripe",
      atsType: "lever",
    });
    expect(parsed.atsType).toBe("lever");
  });

  it("accepts greenhouse as atsType", () => {
    const parsed = CroTools.lookupAtsJob.shape.parameters.parse({
      company: "Stripe",
      atsType: "greenhouse",
    });
    expect(parsed.atsType).toBe("greenhouse");
  });

  it("rejects invalid atsType", () => {
    expect(() =>
      CroTools.lookupAtsJob.shape.parameters.parse({
        company: "Stripe",
        atsType: "workday",
      })
    ).toThrow();
  });

  it("accepts optional jobId", () => {
    const parsed = CroTools.lookupAtsJob.shape.parameters.parse({
      company: "Stripe",
      atsType: "lever",
      jobId: "abc-123",
    });
    expect(parsed.jobId).toBe("abc-123");
  });
});
