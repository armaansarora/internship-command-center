import { z } from "zod/v4";

// -- Shared Primitives --
export const DepartmentId = z.enum([
  "cro",
  "cio",
  "cmo",
  "coo",
  "cpo",
  "cno",
  "cfo",
]);
export type DepartmentId = z.infer<typeof DepartmentId>;
export const AgentPriority = z.enum(["urgent", "high", "normal", "low"]);
export type AgentPriority = z.infer<typeof AgentPriority>;
export const ExecutionId = z.string().describe("Unique hex ID per bell ring");

// -- WORKFLOW events (async, retryable) --

export const BellRingEvent = z.object({
  name: z.literal("bell/ring"),
  data: z.object({
    executionId: ExecutionId,
    userId: z.string(),
    prompt: z.string().optional(),
    trigger: z.enum(["manual", "scheduled", "webhook"]),
    priority: AgentPriority.default("normal"),
    timestamp: z.string().datetime(),
  }),
});

export const CeoDispatchEvent = z.object({
  name: z.literal("ceo/dispatch"),
  data: z.object({
    executionId: ExecutionId,
    department: DepartmentId,
    taskId: z.string(),
    instructions: z.string(),
    context: z.record(z.string(), z.unknown()).optional(),
    priority: AgentPriority,
    deadline: z.string().datetime().optional(),
  }),
});

export const AgentCompleteEvent = z.object({
  name: z.literal("agent/complete"),
  data: z.object({
    executionId: ExecutionId,
    department: DepartmentId,
    taskId: z.string(),
    result: z.record(z.string(), z.unknown()),
    tokenUsage: z.object({ input: z.number(), output: z.number() }),
    durationMs: z.number(),
    timestamp: z.string().datetime(),
  }),
});

export const AgentErrorEvent = z.object({
  name: z.literal("agent/error"),
  data: z.object({
    executionId: ExecutionId,
    department: DepartmentId,
    taskId: z.string(),
    error: z.string(),
    retryable: z.boolean(),
    attempt: z.number(),
    timestamp: z.string().datetime(),
  }),
});

export const BriefingCompileEvent = z.object({
  name: z.literal("briefing/compile"),
  data: z.object({
    executionId: ExecutionId,
    departmentResults: z.array(
      z.object({
        department: DepartmentId,
        taskId: z.string(),
        status: z.enum(["complete", "error", "timeout"]),
        result: z.record(z.string(), z.unknown()).optional(),
      })
    ),
    timestamp: z.string().datetime(),
  }),
});

export const BriefingReadyEvent = z.object({
  name: z.literal("briefing/ready"),
  data: z.object({
    executionId: ExecutionId,
    briefingId: z.string(),
    summary: z.string(),
    timestamp: z.string().datetime(),
  }),
});

export const OutreachDraftEvent = z.object({
  name: z.literal("outreach/draft"),
  data: z.object({
    executionId: ExecutionId,
    outreachId: z.string(),
    department: DepartmentId,
    type: z.enum([
      "cold_email",
      "follow_up",
      "thank_you",
      "networking",
      "cover_letter_send",
    ]),
    contactId: z.string().optional(),
    applicationId: z.string().optional(),
    subject: z.string(),
    body: z.string(),
    timestamp: z.string().datetime(),
  }),
});

export const OutreachApprovedEvent = z.object({
  name: z.literal("outreach/approved"),
  data: z.object({
    outreachId: z.string(),
    approvedAt: z.string().datetime(),
  }),
});

export const OutreachSentEvent = z.object({
  name: z.literal("outreach/sent"),
  data: z.object({
    outreachId: z.string(),
    messageId: z.string().optional(),
    sentAt: z.string().datetime(),
  }),
});

// -- STREAMING events (Inngest -> SSE -> browser) --

export const AgentStartEvent = z.object({
  name: z.literal("agent/start"),
  data: z.object({
    executionId: ExecutionId,
    department: DepartmentId,
    taskId: z.string(),
    timestamp: z.string().datetime(),
  }),
});

export const AgentProgressEvent = z.object({
  name: z.literal("agent/progress"),
  data: z.object({
    executionId: ExecutionId,
    department: DepartmentId,
    taskId: z.string(),
    step: z.string(),
    progress: z.number().min(0).max(100).optional(),
    timestamp: z.string().datetime(),
  }),
});

export const NotificationCreateEvent = z.object({
  name: z.literal("notification/create"),
  data: z.object({
    type: z.string(),
    priority: z.enum(["critical", "high", "medium", "low"]),
    title: z.string(),
    body: z.string(),
    sourceAgent: DepartmentId.optional(),
    sourceEntityId: z.string().optional(),
    sourceEntityType: z.string().optional(),
    channels: z.array(z.enum(["in_app", "push", "email"])),
    actions: z
      .array(
        z.object({
          label: z.string(),
          href: z.string().optional(),
          action: z.string().optional(),
        })
      )
      .optional(),
    timestamp: z.string().datetime(),
  }),
});

// -- CRON events --

export const ScheduledBriefingEvent = z.object({
  name: z.literal("cron/daily-briefing"),
  data: z.object({
    userId: z.string(),
    scheduledTime: z.string().datetime(),
    timezone: z.string(),
  }),
});

export const ScheduledSnapshotEvent = z.object({
  name: z.literal("cron/daily-snapshot"),
  data: z.object({
    date: z.string(),
    timestamp: z.string().datetime(),
  }),
});

// -- Master Event Map --
export const EventMap = {
  "bell/ring": BellRingEvent,
  "ceo/dispatch": CeoDispatchEvent,
  "agent/start": AgentStartEvent,
  "agent/progress": AgentProgressEvent,
  "agent/complete": AgentCompleteEvent,
  "agent/error": AgentErrorEvent,
  "briefing/compile": BriefingCompileEvent,
  "briefing/ready": BriefingReadyEvent,
  "outreach/draft": OutreachDraftEvent,
  "outreach/approved": OutreachApprovedEvent,
  "outreach/sent": OutreachSentEvent,
  "notification/create": NotificationCreateEvent,
  "cron/daily-briefing": ScheduledBriefingEvent,
  "cron/daily-snapshot": ScheduledSnapshotEvent,
} as const;
