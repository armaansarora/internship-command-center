import { z } from "zod/v4";

export const EmailClassification = z.enum([
  "interview_invite",
  "rejection",
  "info_request",
  "follow_up_needed",
  "offer",
  "newsletter",
  "other",
]);

export const CooResultData = z.object({
  emailsSynced: z.number(),
  emailsClassified: z
    .array(
      z.object({
        gmailId: z.string(),
        threadId: z.string(),
        subject: z.string(),
        from: z.string(),
        classification: EmailClassification,
        urgency: z.enum(["high", "medium", "low"]),
        suggestedAction: z.string().optional(),
        linkedApplicationId: z.string().optional(),
      })
    )
    .default([]),
  calendarEventsCreated: z
    .array(
      z.object({
        googleEventId: z.string(),
        title: z.string(),
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        interviewId: z.string().optional(),
      })
    )
    .default([]),
  statusUpdates: z
    .array(
      z.object({
        applicationId: z.string(),
        oldStatus: z.string(),
        newStatus: z.string(),
        reason: z.string(),
      })
    )
    .default([]),
});

export const CooTools = {
  fetchRecentEmails: z.object({
    description: z.literal("Fetch recent emails from Gmail API"),
    parameters: z.object({
      maxResults: z.number().default(20),
      query: z.string().optional(),
      after: z.string().optional(),
    }),
  }),
  classifyEmail: z.object({
    description: z.literal("Classify an email and suggest actions"),
    parameters: z.object({
      gmailId: z.string(),
      threadId: z.string(),
      subject: z.string(),
      from: z.string(),
      snippet: z.string(),
      bodyText: z.string(),
    }),
  }),
  createCalendarEvent: z.object({
    description: z.literal(
      "Create a Google Calendar event for an interview"
    ),
    parameters: z.object({
      title: z.string(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      description: z.string().optional(),
      location: z.string().optional(),
      interviewId: z.string().optional(),
    }),
  }),
  updateApplicationFromEmail: z.object({
    description: z.literal(
      "Update application status based on email content"
    ),
    parameters: z.object({
      applicationId: z.string(),
      newStatus: z.string(),
      reason: z.string(),
      emailGmailId: z.string(),
    }),
  }),
} as const;
