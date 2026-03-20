import { tool } from "ai";
import { z } from "zod/v4";
import {
  getCalendarEvents,
  getFollowUpsDue,
  getUpcomingInterviews,
  getRecentEmails,
  getDailyBriefingData,
  createOutreachDraft,
} from "@/lib/db/queries/communications-rest";

// ---------------------------------------------------------------------------
// Tool 1: checkSchedule
// ---------------------------------------------------------------------------
export function makeCheckScheduleTool(userId: string) {
  return tool({
    description:
      "Get today's and upcoming calendar events and scheduled interviews. Always call this when the user asks about their schedule or what's on the calendar.",
    inputSchema: z.object({
      daysAhead: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(7)
        .describe("How many days ahead to look for events and interviews"),
    }),
    execute: async (input) => {
      const now = new Date();
      const future = new Date(
        now.getTime() + input.daysAhead * 24 * 60 * 60 * 1000
      );
      const [events, interviews] = await Promise.all([
        getCalendarEvents(userId, now.toISOString(), future.toISOString()),
        getUpcomingInterviews(userId, input.daysAhead),
      ]);
      return {
        calendarEvents: events,
        interviews,
        daysAhead: input.daysAhead,
        rangeStart: now.toISOString(),
        rangeEnd: future.toISOString(),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 2: checkFollowUps
// ---------------------------------------------------------------------------
export function makeCheckFollowUpsTool(userId: string) {
  return tool({
    description:
      "Get all overdue follow-ups sorted by urgency (most overdue first). Active applications with no activity for 7+ days. Call this to identify who needs a follow-up email.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe("Maximum number of overdue follow-ups to return"),
    }),
    execute: async (input) => {
      const followUps = await getFollowUpsDue(userId);
      const sorted = [...followUps].sort(
        (a, b) => b.daysSinceActivity - a.daysSinceActivity
      );
      const limited = sorted.slice(0, input.limit);
      return {
        followUps: limited,
        total: followUps.length,
        criticalCount: followUps.filter((f) => f.daysSinceActivity >= 14)
          .length,
        urgentCount: followUps.filter(
          (f) => f.daysSinceActivity >= 7 && f.daysSinceActivity < 14
        ).length,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 3: draftFollowUp
// ---------------------------------------------------------------------------
export function makeDraftFollowUpTool(userId: string) {
  return tool({
    description:
      "Generate a professional follow-up email draft for a specific application and insert it into the outreach queue for approval. Returns the draft content and queue ID.",
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe("UUID of the application needing follow-up"),
      companyName: z.string().describe("Company name for context"),
      role: z.string().describe("Role title for context"),
      daysSinceActivity: z
        .number()
        .int()
        .min(0)
        .describe("Number of days since last activity on this application"),
      recipientName: z
        .string()
        .optional()
        .describe("Name of the recruiter or contact if known"),
      recipientEmail: z
        .string()
        .optional()
        .describe("Email address of the recipient if known"),
      currentStatus: z
        .string()
        .optional()
        .describe("Current application status for context"),
    }),
    execute: async (input) => {
      const recipient = input.recipientName ?? "Hiring Team";
      const subject = `Following Up — ${input.role} at ${input.companyName}`;
      const body = `Hi ${recipient},

I wanted to follow up on my ${input.role} application at ${input.companyName}. It's been ${input.daysSinceActivity} days since my last touchpoint, and I remain very interested in this opportunity.

I'd welcome any update on the timeline or next steps. Please let me know if there's anything further you need from me.

Best regards,
[Your Name]`;

      const result = await createOutreachDraft(userId, {
        applicationId: input.applicationId,
        type: "follow_up",
        subject,
        body,
      });

      return {
        subject,
        body,
        recipientEmail: input.recipientEmail ?? null,
        outreachId: result.outreachId,
        queued: result.success,
        message: result.message,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 4: checkEmails
// ---------------------------------------------------------------------------
export function makeCheckEmailsTool(userId: string) {
  return tool({
    description:
      "Get recent parsed emails with their classifications, urgency levels, and suggested actions. Call this to review what's in the inbox and identify items needing response.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(15)
        .describe("Number of recent emails to retrieve"),
      unreadOnly: z
        .boolean()
        .default(false)
        .describe("When true, return only unread emails"),
    }),
    execute: async (input) => {
      const emails = await getRecentEmails(userId, input.limit);
      const filtered = input.unreadOnly
        ? emails.filter((e) => !e.isRead)
        : emails;
      const unreadCount = emails.filter((e) => !e.isRead).length;
      const unprocessedCount = emails.filter((e) => !e.isProcessed).length;
      return {
        emails: filtered,
        unreadCount,
        unprocessedCount,
        total: filtered.length,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool 5: getOverview
// ---------------------------------------------------------------------------
export function makeGetOverviewTool(userId: string) {
  return tool({
    description:
      "Get the full daily briefing — overdue follow-up count, today's interviews, unread emails count, and pending outreach count. Call this first for a morning briefing or general status check.",
    inputSchema: z.object({}),
    execute: async () => {
      const briefing = await getDailyBriefingData(userId);
      return briefing;
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: build all tools for a given user session
// ---------------------------------------------------------------------------
export function buildCOOTools(userId: string) {
  return {
    checkSchedule: makeCheckScheduleTool(userId),
    checkFollowUps: makeCheckFollowUpsTool(userId),
    draftFollowUp: makeDraftFollowUpTool(userId),
    checkEmails: makeCheckEmailsTool(userId),
    getOverview: makeGetOverviewTool(userId),
  };
}
