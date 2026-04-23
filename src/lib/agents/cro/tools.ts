import { tool } from "ai";
import { z } from "zod/v4";
import {
  queryApplicationsForAgent,
  updateApplicationStatusRest,
  analyzeConversionRatesRest,
} from "@/lib/db/queries/applications-rest";
import {
  TargetProfileSchema,
  upsertTargetProfile,
} from "./target-profile";

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
    execute: async (input) => {
      return queryApplicationsForAgent(userId, {
        status: input.status,
        daysStale: input.daysStale,
        limit: input.limit,
        sortBy: input.sortBy,
      });
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
      if (input.action === "update_status" && input.newStatus) {
        return updateApplicationStatusRest(userId, input.applicationId, input.newStatus);
      }

      if (input.action === "add_note" && input.note) {
        return updateApplicationStatusRest(
          userId,
          input.applicationId,
          "", // empty = no status change, handled below
          input.note
        );
      }

      if (input.action === "archive") {
        return updateApplicationStatusRest(userId, input.applicationId, "withdrawn");
      }

      if (input.action === "mark_followup_sent") {
        return updateApplicationStatusRest(
          userId,
          input.applicationId,
          "", // no status change
          "Follow-up sent"
        );
      }

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
    execute: async (input) => {
      return analyzeConversionRatesRest(userId, input.fromDate, input.toDate);
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: captureTargetProfile
// ---------------------------------------------------------------------------
export function makeCaptureTargetProfileTool(userId: string) {
  return tool({
    description:
      "Record the user's target profile after they have stated what they want. Call this only when you have extracted concrete roles, geographies, and at least one must-have or company from the conversation. This unlocks Job Discovery — no jobs arrive until a profile is stored.",
    inputSchema: TargetProfileSchema,
    execute: async (input) => {
      const stored = await upsertTargetProfile(userId, input);
      if (!stored) {
        return {
          success: false,
          message:
            "Could not record the target profile. Ask the user to repeat the key details and try again.",
        };
      }
      return {
        success: true,
        rowId: stored.rowId,
        embedded: Array.isArray(stored.embedding),
        updatedAt: stored.updatedAt,
        roles: stored.profile.roles,
        companies: stored.profile.companies,
        geos: stored.profile.geos,
        message:
          "Target profile recorded. Job Discovery can now begin hunting against these parameters.",
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
    captureTargetProfile: makeCaptureTargetProfileTool(userId),
  };
}
