import { describe, it, expect } from "vitest";
import { CioResultData, CioTools } from "@/contracts/departments/cio";

describe("CioResultData", () => {
  it("parses valid research result", () => {
    const result = CioResultData.parse({
      companyProfile: {
        companyId: "c1",
        name: "Stripe",
        domain: "stripe.com",
        industry: "fintech",
      },
      researchSources: [
        {
          source: "tavily",
          summary: "Found company info",
          retrievedAt: "2026-03-12T10:00:00Z",
        },
      ],
      confidence: 85,
    });
    expect(result.companyProfile.name).toBe("Stripe");
    expect(result.confidence).toBe(85);
  });

  it("applies defaults for optional arrays", () => {
    const result = CioResultData.parse({
      companyProfile: { companyId: "c1", name: "Acme" },
      confidence: 50,
    });
    expect(result.researchSources).toEqual([]);
    expect(result.companyProfile.keyPeople).toEqual([]);
  });

  it("rejects confidence out of range", () => {
    expect(() =>
      CioResultData.parse({
        companyProfile: { companyId: "c1", name: "X" },
        confidence: 150,
      })
    ).toThrow();
  });

  it("rejects invalid research source", () => {
    expect(() =>
      CioResultData.parse({
        companyProfile: { companyId: "c1", name: "X" },
        researchSources: [
          {
            source: "google",
            summary: "x",
            retrievedAt: "2026-03-12T10:00:00Z",
          },
        ],
        confidence: 50,
      })
    ).toThrow();
  });
});

describe("CioTools", () => {
  it("searchCompany has correct description literal", () => {
    const parsed = CioTools.searchCompany.shape.description.parse(
      "Search for company information using Tavily"
    );
    expect(parsed).toBe("Search for company information using Tavily");
  });

  it("scrapeUrl requires valid URL", () => {
    expect(() =>
      CioTools.scrapeUrl.shape.parameters.parse({
        url: "not-a-url",
      })
    ).toThrow();
  });

  it("lookupSecFilings defaults to 10-K", () => {
    const parsed = CioTools.lookupSecFilings.shape.parameters.parse({
      companyName: "Apple Inc",
    });
    expect(parsed.filingType).toBe("10-K");
  });

  it("getEconomicData defaults limit to 10", () => {
    const parsed = CioTools.getEconomicData.shape.parameters.parse({
      seriesId: "UNRATE",
    });
    expect(parsed.limit).toBe(10);
  });

  it("upsertCompany requires name", () => {
    expect(() =>
      CioTools.upsertCompany.shape.parameters.parse({})
    ).toThrow();
  });
});
