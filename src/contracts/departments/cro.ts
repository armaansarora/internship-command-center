import { z } from "zod/v4";

export const CroResultData = z.object({
  pipelineSnapshot: z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
    byTier: z.record(z.string(), z.number()),
  }),
  actionItems: z.array(
    z.object({
      applicationId: z.string(),
      company: z.string(),
      role: z.string(),
      action: z.string(),
      urgency: z.enum(["high", "medium", "low"]),
    })
  ),
  newOpportunities: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
        url: z.string().optional(),
        matchScore: z.number().min(0).max(100),
        reasoning: z.string(),
      })
    )
    .default([]),
  statusChanges: z
    .array(
      z.object({
        applicationId: z.string(),
        from: z.string(),
        to: z.string(),
        reason: z.string(),
      })
    )
    .default([]),
});

export const CroTools = {
  queryApplications: z.object({
    description: z.literal("Query the applications table with filters"),
    parameters: z.object({
      status: z.array(z.string()).optional(),
      tier: z.array(z.number()).optional(),
      companyId: z.string().optional(),
      createdAfter: z.string().datetime().optional(),
      limit: z.number().default(50),
    }),
  }),
  updateApplicationStatus: z.object({
    description: z.literal("Update an application's status"),
    parameters: z.object({
      applicationId: z.string(),
      newStatus: z.string(),
      reason: z.string(),
    }),
  }),
  suggestFollowUp: z.object({
    description: z.literal(
      "Draft a follow-up outreach for stale applications"
    ),
    parameters: z.object({
      applicationId: z.string(),
      contactId: z.string().optional(),
      suggestedSubject: z.string(),
      suggestedBody: z.string(),
    }),
  }),
  analyzeConversionRates: z.object({
    description: z.literal(
      "Calculate conversion rates between pipeline stages"
    ),
    parameters: z.object({
      fromDate: z.string().datetime().optional(),
      toDate: z.string().datetime().optional(),
    }),
  }),
  searchJobs: z.object({
    description: z.literal(
      "Search for internship job listings using JSearch API"
    ),
    parameters: z.object({
      query: z.string(),
      location: z.string().optional(),
      datePosted: z
        .enum(["today", "3days", "week", "month"])
        .default("week"),
      remoteOnly: z.boolean().default(false),
      limit: z.number().default(10),
    }),
  }),
  lookupAtsJob: z.object({
    description: z.literal(
      "Look up a specific job on Lever or Greenhouse ATS"
    ),
    parameters: z.object({
      company: z.string(),
      atsType: z.enum(["lever", "greenhouse"]),
      jobId: z.string().optional(),
    }),
  }),
} as const;
