import { z } from "zod/v4";

export const CioResultData = z.object({
  companyProfile: z.object({
    companyId: z.string(),
    name: z.string(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    sector: z.string().optional(),
    size: z.enum(["startup", "mid", "large", "enterprise"]).optional(),
    headquarters: z.string().optional(),
    description: z.string().optional(),
    cultureSummary: z.string().optional(),
    recentNews: z.string().optional(),
    financialsSummary: z.string().optional(),
    keyPeople: z
      .array(
        z.object({
          name: z.string(),
          title: z.string(),
          linkedinUrl: z.string().optional(),
        })
      )
      .default([]),
    internshipIntel: z.string().optional(),
    careersUrl: z.string().optional(),
    linkedinUrl: z.string().optional(),
    glassdoorUrl: z.string().optional(),
  }),
  researchSources: z
    .array(
      z.object({
        source: z.enum(["tavily", "firecrawl", "sec_edgar", "fred", "manual"]),
        url: z.string().optional(),
        summary: z.string(),
        retrievedAt: z.string().datetime(),
      })
    )
    .default([]),
  marketContext: z
    .object({
      industryTrends: z.string().optional(),
      economicIndicators: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
            source: z.string(),
          })
        )
        .default([]),
    })
    .optional(),
  confidence: z.number().min(0).max(100),
});

export const CioTools = {
  searchCompany: z.object({
    description: z.literal("Search for company information using Tavily"),
    parameters: z.object({
      query: z.string(),
      maxResults: z.number().default(5),
    }),
  }),
  scrapeUrl: z.object({
    description: z.literal(
      "Scrape a specific URL for company data using Firecrawl"
    ),
    parameters: z.object({
      url: z.string().url(),
      extractFields: z.array(z.string()).optional(),
    }),
  }),
  lookupSecFilings: z.object({
    description: z.literal(
      "Look up SEC EDGAR filings for a public company"
    ),
    parameters: z.object({
      companyName: z.string(),
      cik: z.string().optional(),
      filingType: z
        .enum(["10-K", "10-Q", "8-K", "DEF 14A"])
        .default("10-K"),
      limit: z.number().default(3),
    }),
  }),
  getEconomicData: z.object({
    description: z.literal("Get economic indicators from FRED API"),
    parameters: z.object({
      seriesId: z.string(),
      observationStart: z.string().optional(),
      limit: z.number().default(10),
    }),
  }),
  upsertCompany: z.object({
    description: z.literal(
      "Create or update a company record in the database"
    ),
    parameters: z.object({
      name: z.string(),
      domain: z.string().optional(),
      industry: z.string().optional(),
      sector: z.string().optional(),
      size: z.enum(["startup", "mid", "large", "enterprise"]).optional(),
      headquarters: z.string().optional(),
      description: z.string().optional(),
      cultureSummary: z.string().optional(),
      recentNews: z.string().optional(),
      financialsSummary: z.string().optional(),
      keyPeople: z
        .array(
          z.object({
            name: z.string(),
            title: z.string(),
            linkedinUrl: z.string().optional(),
          })
        )
        .optional(),
      internshipIntel: z.string().optional(),
      careersUrl: z.string().optional(),
      linkedinUrl: z.string().optional(),
      glassdoorUrl: z.string().optional(),
    }),
  }),
} as const;
