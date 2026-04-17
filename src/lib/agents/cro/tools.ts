import { tool } from "ai";
import { z } from "zod/v4";
import {
  getApplicationById,
  getPipelineStats,
  queryApplicationsForAgent,
  updateApplication,
  updateApplicationStatus,
} from "@/lib/db/queries/applications";
const statusEnum = z.enum([
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
]);

// ---------------------------------------------------------------------------
// Tool 1: queryApplications
// ---------------------------------------------------------------------------
export function makeQueryApplicationsTool(userId: string) {
  return tool({
    description:
      "Query the user's applications with optional filters. Always call this before making pipeline claims.",
    inputSchema: z.object({
      status: z.array(statusEnum).optional(),
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
        statuses: input.status,
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
      applicationId: z.string().uuid(),
      action: z.enum([
        "update_status",
        "add_note",
        "mark_followup_sent",
        "archive",
      ]),
      newStatus: statusEnum.optional(),
      note: z.string().max(1000).optional(),
    }),
    execute: async (input) => {
      const existing = await getApplicationById(userId, input.applicationId);
      if (!existing) {
        return {
          success: false as const,
          applicationId: input.applicationId,
          action: input.action,
          message: "No application found with that id (or access denied).",
        };
      }

      if (input.action === "update_status") {
        if (!input.newStatus) {
          return {
            success: false as const,
            applicationId: input.applicationId,
            action: input.action,
            message: "newStatus is required for update_status.",
          };
        }
        await updateApplicationStatus(
          userId,
          input.applicationId,
          input.newStatus
        );
        return {
          success: true as const,
          applicationId: input.applicationId,
          action: input.action,
          message: `Status updated to ${input.newStatus}.`,
        };
      }

      if (input.action === "add_note") {
        if (!input.note?.trim()) {
          return {
            success: false as const,
            applicationId: input.applicationId,
            action: input.action,
            message: "note is required for add_note.",
          };
        }
        const prev = existing.notes?.trim() ?? "";
        const merged = prev ? `${prev}\n${input.note.trim()}` : input.note.trim();
        await updateApplication(userId, input.applicationId, { notes: merged });
        return {
          success: true as const,
          applicationId: input.applicationId,
          action: input.action,
          message: "Note appended.",
        };
      }

      if (input.action === "mark_followup_sent") {
        const stamp = `[follow-up sent ${new Date().toISOString().slice(0, 10)}]`;
        const prev = existing.notes?.trim() ?? "";
        const merged = prev ? `${prev}\n${stamp}` : stamp;
        await updateApplication(userId, input.applicationId, { notes: merged });
        return {
          success: true as const,
          applicationId: input.applicationId,
          action: input.action,
          message: "Follow-up logged on application record.",
        };
      }

      if (input.action === "archive") {
        await updateApplicationStatus(userId, input.applicationId, "withdrawn");
        return {
          success: true as const,
          applicationId: input.applicationId,
          action: input.action,
          message: "Application archived (withdrawn).",
        };
      }

      return {
        success: false as const,
        applicationId: input.applicationId,
        action: input.action,
        message: "Unknown action.",
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
      applicationId: z.string().uuid(),
      recipientName: z.string().optional(),
      recipientEmail: z.string().optional(),
      daysSinceApplied: z.number().int().min(0),
      companyName: z.string(),
      role: z.string(),
    }),
    execute: async (input) => {
      const app = await getApplicationById(userId, input.applicationId);
      if (!app) {
        return {
          error: "Application not found or access denied.",
          applicationId: input.applicationId,
          subject: null,
          body: null,
          recipientEmail: input.recipientEmail ?? null,
        };
      }

      const company = input.companyName || app.companyName || "the company";
      const role = input.role || app.role;
      const recipient = input.recipientName ?? "Hiring Team";
      const subject = `Following Up — ${role} Application`;
      const body = `Hi ${recipient},

I wanted to follow up on my application for the ${role} position at ${company}, submitted ${input.daysSinceApplied} days ago. I remain very excited about this opportunity and would welcome the chance to discuss how my background aligns with your needs.

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
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }),
    execute: async (input) => {
      const stats = await getPipelineStats(userId);
      const by = stats.byStatus;
      const discovered = by["discovered"] ?? 0;
      const applied = by["applied"] ?? 0;
      const screening = by["screening"] ?? 0;
      const interviewScheduled = by["interview_scheduled"] ?? 0;
      const interviewing = by["interviewing"] ?? 0;
      const interviewTotal = interviewScheduled + interviewing;
      const offer = by["offer"] ?? 0;

      const totalTracked = Object.values(by).reduce((a, b) => a + b, 0);

      const discoveredToApplied =
        discovered + applied > 0
          ? { rate: (applied / Math.max(discovered + applied, 1)) * 100, count: applied }
          : { rate: 0, count: 0 };

      return {
        window: {
          from: input.fromDate ?? null,
          to: input.toDate ?? null,
          note: "Rates reflect your current pipeline snapshot (not a historical window) until time-filtered analytics ship.",
        },
        rates: {
          discoveredToApplied: {
            ...discoveredToApplied,
            industryAvg: 80,
          },
          appliedToScreening: {
            rate: stats.appliedToScreeningRate,
            count: screening,
            industryAvg: 20,
          },
          screeningToInterview: {
            rate: stats.screeningToInterviewRate,
            count: interviewTotal,
            industryAvg: 25,
          },
          interviewToOffer: {
            rate: stats.interviewToOfferRate,
            count: offer,
            industryAvg: 15,
          },
        },
        totalAnalyzed: totalTracked,
        insight:
          totalTracked === 0
            ? "No applications in your pipeline yet. Add roles to the War Room to unlock conversion analytics."
            : `Live pipeline: ${stats.total} active, ${stats.offers} offers, ${stats.staleCount} stale (14d+ no activity). Conversion label: ${stats.conversionLabel}.`,
      };
    },
  });
}

// ---------------------------------------------------------------------------
export function buildCROTools(userId: string) {
  return {
    queryApplications: makeQueryApplicationsTool(userId),
    manageApplication: makeManageApplicationTool(userId),
    suggestFollowUp: makeSuggestFollowUpTool(userId),
    analyzeConversionRates: makeAnalyzeConversionRatesTool(userId),
  };
}
