import { tool } from "ai";
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Tool 1: queryApplications
// ---------------------------------------------------------------------------
export function makeQueryApplicationsTool(userId: string) {
  return tool({
    description:
      "Query the user's applications with optional filters. Always call this before making pipeline claims.",
    inputSchema: z.object({
      status: z
        .array(
          z.enum([
            "discovered",
            "applied",
            "screening",
            "interview_scheduled",
            "interviewing",
            "under_review",
            "offer",
            "accepted",
            "rejected",
            "withdrawn",
          ])
        )
        .optional()
        .describe("Filter by one or more statuses"),
      daysStale: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Return only applications with no activity in this many days or more"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Maximum number of results to return"),
      sortBy: z
        .enum(["staleness_desc", "created_desc", "company_asc"])
        .default("staleness_desc")
        .describe("Sort order for results"),
    }),
    execute: async (_input) => {
      // TODO: wire to real DB queries
      // const apps = await db.select().from(applications).where(...)
      void userId;
      return {
        applications: [] as Array<{
          id: string;
          companyName: string;
          role: string;
          status: string;
          daysSinceActivity: number;
          appliedAt: string | null;
          tier: number | null;
        }>,
        total: 0,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 2: manageApplication
// ---------------------------------------------------------------------------
export function makeManageApplicationTool(userId: string) {
  return tool({
    description:
      "Update an application's status, add a note, mark a follow-up as sent, or archive it.",
    inputSchema: z.object({
      applicationId: z.string().describe("UUID of the application to update"),
      action: z
        .enum([
          "update_status",
          "add_note",
          "mark_followup_sent",
          "archive",
        ])
        .describe("The management action to perform"),
      newStatus: z
        .enum([
          "discovered",
          "applied",
          "screening",
          "interview_scheduled",
          "interviewing",
          "under_review",
          "offer",
          "accepted",
          "rejected",
          "withdrawn",
        ])
        .optional()
        .describe("Required when action is update_status"),
      note: z
        .string()
        .max(1000)
        .optional()
        .describe("Required when action is add_note"),
    }),
    execute: async (input) => {
      // TODO: wire to real DB queries
      // await db.update(applications).set({ status: input.newStatus }).where(...)
      void userId;
      return {
        success: true,
        applicationId: input.applicationId,
        action: input.action,
        message: `Action '${input.action}' recorded for application ${input.applicationId}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: suggestFollowUp
// ---------------------------------------------------------------------------
export function makeSuggestFollowUpTool(userId: string) {
  return tool({
    description:
      "Generate a ready-to-send follow-up email draft for a specific application.",
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe("UUID of the application needing follow-up"),
      recipientName: z
        .string()
        .optional()
        .describe("Name of the recruiter or contact if known"),
      recipientEmail: z
        .string()
        .optional()
        .describe("Email address of the recipient if known"),
      daysSinceApplied: z
        .number()
        .int()
        .min(0)
        .describe("Number of days since the application was submitted"),
      companyName: z.string().describe("Company name for context"),
      role: z.string().describe("Role title for context"),
    }),
    execute: async (input) => {
      // TODO: wire to real DB queries to fetch contact info
      void userId;
      const recipient = input.recipientName ?? "Hiring Team";
      const subject = `Following Up — ${input.role} Application`;
      const body = `Hi ${recipient},

I wanted to follow up on my application for the ${input.role} position at ${input.companyName}, submitted ${input.daysSinceApplied} days ago. I remain very excited about this opportunity and would welcome the chance to discuss how my background aligns with your needs.

Please let me know if there's any additional information I can provide.

Best,
[Your Name]`;

      return {
        applicationId: input.applicationId,
        subject,
        body,
        recipientEmail: input.recipientEmail ?? null,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: analyzeConversionRates
// ---------------------------------------------------------------------------
export function makeAnalyzeConversionRatesTool(userId: string) {
  return tool({
    description:
      "Calculate stage-to-stage conversion rates across the user's full pipeline. Compares against industry benchmarks.",
    inputSchema: z.object({
      fromDate: z
        .string()
        .optional()
        .describe(
          "ISO date string — start of the analysis window (default: 90 days ago)"
        ),
      toDate: z
        .string()
        .optional()
        .describe("ISO date string — end of the analysis window (default: now)"),
    }),
    execute: async (_input) => {
      // TODO: wire to real DB queries
      void userId;
      return {
        window: {
          from: _input.fromDate ?? null,
          to: _input.toDate ?? null,
        },
        rates: {
          discoveredToApplied: { rate: 0, count: 0, industryAvg: 80 },
          appliedToScreening: { rate: 0, count: 0, industryAvg: 20 },
          screeningToInterview: { rate: 0, count: 0, industryAvg: 25 },
          interviewToOffer: { rate: 0, count: 0, industryAvg: 15 },
        },
        totalAnalyzed: 0,
        insight:
          "No applications found in this window. Start adding applications to track your pipeline.",
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCROTools(userId: string) {
  return {
    queryApplications: makeQueryApplicationsTool(userId),
    manageApplication: makeManageApplicationTool(userId),
    suggestFollowUp: makeSuggestFollowUpTool(userId),
    analyzeConversionRates: makeAnalyzeConversionRatesTool(userId),
  };
}
