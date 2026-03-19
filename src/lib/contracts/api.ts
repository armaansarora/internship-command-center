import { z } from "zod/v4";
import { ExecutionId, DepartmentId, AgentPriority } from "./events";
import { BriefingSummary } from "./agent-protocol";

// POST /api/agents/bell
export const BellRingRequest = z.object({
  prompt: z.string().optional(),
  trigger: z.enum(["manual", "scheduled", "webhook"]).default("manual"),
  priority: AgentPriority.default("normal"),
});
export const BellRingResponse = z.object({
  executionId: ExecutionId,
  status: z.literal("dispatched"),
  message: z.string(),
});

// GET /api/agents/stream?executionId=xxx (SSE)
export const AgentStreamParams = z.object({ executionId: ExecutionId });

export const SSEEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("agent_start"),
    department: DepartmentId,
    taskId: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("agent_progress"),
    department: DepartmentId,
    step: z.string(),
    progress: z.number().min(0).max(100).optional(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("agent_complete"),
    department: DepartmentId,
    summary: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("agent_error"),
    department: DepartmentId,
    error: z.string(),
    retryable: z.boolean(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("briefing_ready"),
    briefingId: z.string(),
    headline: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("heartbeat"),
    timestamp: z.string().datetime(),
  }),
]);

// GET /api/agents/briefing/[id]
export const BriefingResponse = BriefingSummary;
export const LatestBriefingResponse = BriefingSummary.nullable();

// GET /api/notifications/stream (SSE)
export const NotificationSSEEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("new_notification"),
    id: z.string(),
    title: z.string(),
    body: z.string(),
    priority: z.enum(["critical", "high", "medium", "low"]),
    sourceAgent: DepartmentId.optional(),
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
  z.object({ type: z.literal("unread_count"), count: z.number() }),
]);

// GET /api/notifications
export const NotificationListParams = z.object({
  limit: z.number().default(20),
  offset: z.number().default(0),
  unreadOnly: z.boolean().default(false),
});
export const NotificationListResponse = z.object({
  notifications: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      priority: z.enum(["critical", "high", "medium", "low"]),
      title: z.string(),
      body: z.string(),
      sourceAgent: z.string().nullable(),
      isRead: z.boolean(),
      actions: z.unknown().nullable(),
      createdAt: z.string().datetime(),
    })
  ),
  total: z.number(),
  unreadCount: z.number(),
});

// POST /api/notifications/[id]/read
export const MarkReadResponse = z.object({ success: z.boolean() });

// POST /api/outreach/[id]/approve
export const OutreachApproveResponse = z.object({
  success: z.boolean(),
  outreachId: z.string(),
  status: z.literal("approved"),
});

// POST /api/outreach/[id]/reject
export const OutreachRejectRequest = z.object({
  reason: z.string().optional(),
});
export const OutreachRejectResponse = z.object({
  success: z.boolean(),
  outreachId: z.string(),
  status: z.literal("rejected"),
});

// Route Manifest
export const ROUTE_MANIFEST = {
  "POST /api/agents/bell": { req: BellRingRequest, res: BellRingResponse },
  "GET  /api/agents/stream": { params: AgentStreamParams, sse: SSEEvent },
  "GET  /api/agents/briefing/[id]": { res: BriefingResponse },
  "GET  /api/agents/briefing/latest": { res: LatestBriefingResponse },
  "GET  /api/notifications": {
    params: NotificationListParams,
    res: NotificationListResponse,
  },
  "GET  /api/notifications/stream": { sse: NotificationSSEEvent },
  "POST /api/notifications/[id]/read": { res: MarkReadResponse },
  "POST /api/outreach/[id]/approve": { res: OutreachApproveResponse },
  "POST /api/outreach/[id]/reject": {
    req: OutreachRejectRequest,
    res: OutreachRejectResponse,
  },
} as const;
