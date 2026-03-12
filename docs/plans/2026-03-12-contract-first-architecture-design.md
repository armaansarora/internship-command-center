# Contract-First Architecture Design — Phase 1

> Approved 2026-03-12. All Phase 1 implementation references this document.
> Contracts are CODE (TypeScript + Zod) — the single source of truth.

---

## 1. Phase 0 Hardening — V1 Teardown

26 files import V1 schema (`@/db/schema`). V2 exists at `schema-v2.ts` (15 tables). Remove V1 entirely.

| Step | Action | Details |
|------|--------|---------|
| 0H-1 | Delete V1 schema | `src/db/schema.ts` |
| 0H-2 | Promote V2 | Rename `schema-v2.ts` → `schema.ts`, update `drizzle.config.ts` |
| 0H-3 | Delete migration scripts | `src/db/migrate-v1-to-v2.ts`, `scripts/migrate-to-turso.ts` (already executed) |
| 0H-4 | Stub server actions | 11 lib files → same exports but throw `"Not implemented — awaiting Phase 1"` |
| 0H-5 | Stub V1 pages | `/applications`, `/contacts`, `/cover-letters`, `/follow-ups` → "Under Construction" placeholders |
| 0H-6 | Delete V1 components | 7 files: `applications-view`, `card-grid-view`, `application-card`, `app-table`, `columns`, `version-compare`, `version-history` |
| 0H-7 | Delete V1 tests | `schema.test.ts`, `contacts-schema.test.ts`, `interview-prep.test.ts`, `cover-letter-versions.test.ts`, `db/migration.test.ts`. Keep `db/schema-v2.test.ts` |
| 0H-8 | Create stub pages | `/research`, `/communications`, `/preparation`, `/analytics`, `/agents` |
| 0H-9 | Clean deps | Remove `@mastra/core`, `openai`. Keep `ai` (Vercel AI SDK) + `@anthropic-ai/sdk` |
| 0H-10 | Env vars | Add `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` to `.env.example` |
| 0H-11 | Update STATE.md | V1 removed, AI SDK = Vercel AI SDK v4.x, Phase 0 hardened |
| 0H-12 | Verify | `npm run build` + `npm test` pass clean |

---

## 2. Contract File Structure

```
src/contracts/
├── events.ts              # 14 Inngest event schemas (Zod)
├── agent-protocol.ts      # Agent definition, task, result, CEO types
├── departments/
│   └── cro.ts             # CRO result data + tool schemas
├── api.ts                 # 9 API route request/response types + route manifest
├── notifications.ts       # Notification types, push payload, channel routing
├── ui.ts                  # Component prop interfaces
└── index.ts               # Barrel re-export
```

**Rule:** If a type crosses domain boundaries (agents + API, agents + UI), it lives in `src/contracts/`. No exceptions.

---

## 3. Event Contracts — `src/contracts/events.ts`

```ts
import { z } from "zod/v4";

// ── Shared Primitives ──
export const DepartmentId = z.enum(["cro","cio","cmo","coo","cpo","cno","cfo"]);
export type DepartmentId = z.infer<typeof DepartmentId>;
export const AgentPriority = z.enum(["urgent","high","normal","low"]);
export const ExecutionId = z.string().describe("Unique hex ID per bell ring");

// ── WORKFLOW events (async, retryable) ──

export const BellRingEvent = z.object({
  name: z.literal("bell/ring"),
  data: z.object({
    executionId: ExecutionId,
    userId: z.string(),
    prompt: z.string().optional(),
    trigger: z.enum(["manual","scheduled","webhook"]),
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
    context: z.record(z.unknown()).optional(),
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
    result: z.record(z.unknown()),
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
    departmentResults: z.array(z.object({
      department: DepartmentId,
      taskId: z.string(),
      status: z.enum(["complete","error","timeout"]),
      result: z.record(z.unknown()).optional(),
    })),
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
    type: z.enum(["cold_email","follow_up","thank_you","networking","cover_letter_send"]),
    contactId: z.string().optional(),
    applicationId: z.string().optional(),
    subject: z.string(),
    body: z.string(),
    timestamp: z.string().datetime(),
  }),
});

export const OutreachApprovedEvent = z.object({
  name: z.literal("outreach/approved"),
  data: z.object({ outreachId: z.string(), approvedAt: z.string().datetime() }),
});

export const OutreachSentEvent = z.object({
  name: z.literal("outreach/sent"),
  data: z.object({
    outreachId: z.string(),
    messageId: z.string().optional(),
    sentAt: z.string().datetime(),
  }),
});

// ── STREAMING events (Inngest → SSE → browser) ──

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
    priority: z.enum(["critical","high","medium","low"]),
    title: z.string(),
    body: z.string(),
    sourceAgent: DepartmentId.optional(),
    sourceEntityId: z.string().optional(),
    sourceEntityType: z.string().optional(),
    channels: z.array(z.enum(["in_app","push","email"])),
    actions: z.array(z.object({
      label: z.string(),
      href: z.string().optional(),
      action: z.string().optional(),
    })).optional(),
    timestamp: z.string().datetime(),
  }),
});

// ── CRON events ──

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
  data: z.object({ date: z.string(), timestamp: z.string().datetime() }),
});

// ── Master Event Map ──
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
```

---

## 4. Agent Protocol — `src/contracts/agent-protocol.ts`

```ts
import { z } from "zod/v4";
import { DepartmentId, ExecutionId, AgentPriority } from "./events";

export const AgentDefinition = z.object({
  department: DepartmentId,
  name: z.string(),
  codename: z.string(),
  description: z.string(),
  model: z.string().default("claude-sonnet-4-20250514"),
  maxTokens: z.number().default(4096),
  tokenBudget: z.number().default(100_000),
  temperature: z.number().min(0).max(1).default(0.3),
  retryConfig: z.object({
    maxAttempts: z.number().default(3),
    backoffMs: z.number().default(1000),
  }).default({}),
});

export const AgentTask = z.object({
  executionId: ExecutionId,
  taskId: z.string(),
  department: DepartmentId,
  instructions: z.string(),
  context: z.object({
    userPrompt: z.string().optional(),
    relatedEntities: z.array(z.object({ type: z.string(), id: z.string() })).default([]),
    previousResults: z.record(z.unknown()).optional(),
  }),
  priority: AgentPriority,
  constraints: z.object({
    maxTokens: z.number().optional(),
    deadline: z.string().datetime().optional(),
    noSideEffects: z.boolean().default(false),
  }).default({}),
});

export const AgentResult = z.object({
  executionId: ExecutionId,
  taskId: z.string(),
  department: DepartmentId,
  status: z.enum(["success","partial","error"]),
  summary: z.string(),
  data: z.record(z.unknown()),
  actions: z.array(z.object({
    type: z.enum(["outreach_draft","status_update","schedule","research","notify"]),
    payload: z.record(z.unknown()),
    requiresApproval: z.boolean(),
  })).default([]),
  tokenUsage: z.object({ input: z.number(), output: z.number() }),
  durationMs: z.number(),
});

export const CeoDecision = z.object({
  departments: z.array(z.object({
    department: DepartmentId,
    instructions: z.string(),
    priority: AgentPriority,
    dependsOn: z.array(DepartmentId).default([]),
  })),
  reasoning: z.string(),
});

export const BriefingSummary = z.object({
  executionId: ExecutionId,
  briefingId: z.string(),
  headline: z.string(),
  sections: z.array(z.object({
    department: DepartmentId,
    title: z.string(),
    content: z.string(),
    highlights: z.array(z.string()).default([]),
    pendingActions: z.array(z.object({
      description: z.string(),
      actionType: z.string(),
      entityId: z.string().optional(),
    })).default([]),
  })),
  metrics: z.object({
    totalTokensUsed: z.number(),
    totalDurationMs: z.number(),
    departmentsInvolved: z.array(DepartmentId),
  }),
  createdAt: z.string().datetime(),
});
```

### CRO Department — `src/contracts/departments/cro.ts`

```ts
import { z } from "zod/v4";

export const CroResultData = z.object({
  pipelineSnapshot: z.object({
    total: z.number(),
    byStatus: z.record(z.number()),
    byTier: z.record(z.number()),
  }),
  actionItems: z.array(z.object({
    applicationId: z.string(),
    company: z.string(),
    role: z.string(),
    action: z.string(),
    urgency: z.enum(["high","medium","low"]),
  })),
  newOpportunities: z.array(z.object({
    company: z.string(),
    role: z.string(),
    url: z.string().optional(),
    matchScore: z.number().min(0).max(100),
    reasoning: z.string(),
  })).default([]),
  statusChanges: z.array(z.object({
    applicationId: z.string(),
    from: z.string(),
    to: z.string(),
    reason: z.string(),
  })).default([]),
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
    description: z.literal("Draft a follow-up outreach for stale applications"),
    parameters: z.object({
      applicationId: z.string(),
      contactId: z.string().optional(),
      suggestedSubject: z.string(),
      suggestedBody: z.string(),
    }),
  }),
  analyzeConversionRates: z.object({
    description: z.literal("Calculate conversion rates between pipeline stages"),
    parameters: z.object({
      fromDate: z.string().datetime().optional(),
      toDate: z.string().datetime().optional(),
    }),
  }),
} as const;
```

---

## 5. API Route Contracts — `src/contracts/api.ts`

```ts
import { z } from "zod/v4";
import { ExecutionId, DepartmentId, AgentPriority } from "./events";
import { BriefingSummary } from "./agent-protocol";

// POST /api/agents/bell
export const BellRingRequest = z.object({
  prompt: z.string().optional(),
  trigger: z.enum(["manual","scheduled","webhook"]).default("manual"),
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
  z.object({ type: z.literal("agent_start"), department: DepartmentId, taskId: z.string(), timestamp: z.string().datetime() }),
  z.object({ type: z.literal("agent_progress"), department: DepartmentId, step: z.string(), progress: z.number().min(0).max(100).optional(), timestamp: z.string().datetime() }),
  z.object({ type: z.literal("agent_complete"), department: DepartmentId, summary: z.string(), timestamp: z.string().datetime() }),
  z.object({ type: z.literal("agent_error"), department: DepartmentId, error: z.string(), retryable: z.boolean(), timestamp: z.string().datetime() }),
  z.object({ type: z.literal("briefing_ready"), briefingId: z.string(), headline: z.string(), timestamp: z.string().datetime() }),
  z.object({ type: z.literal("heartbeat"), timestamp: z.string().datetime() }),
]);

// GET /api/agents/briefing/[id]
export const BriefingResponse = BriefingSummary;
export const LatestBriefingResponse = BriefingSummary.nullable();

// GET /api/notifications/stream (SSE)
export const NotificationSSEEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("new_notification"),
    id: z.string(), title: z.string(), body: z.string(),
    priority: z.enum(["critical","high","medium","low"]),
    sourceAgent: DepartmentId.optional(),
    actions: z.array(z.object({ label: z.string(), href: z.string().optional(), action: z.string().optional() })).optional(),
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
  notifications: z.array(z.object({
    id: z.string(), type: z.string(),
    priority: z.enum(["critical","high","medium","low"]),
    title: z.string(), body: z.string(),
    sourceAgent: z.string().nullable(), isRead: z.boolean(),
    actions: z.unknown().nullable(), createdAt: z.string().datetime(),
  })),
  total: z.number(),
  unreadCount: z.number(),
});

// POST /api/notifications/[id]/read
export const MarkReadResponse = z.object({ success: z.boolean() });

// POST /api/outreach/[id]/approve
export const OutreachApproveResponse = z.object({
  success: z.boolean(), outreachId: z.string(), status: z.literal("approved"),
});

// POST /api/outreach/[id]/reject
export const OutreachRejectRequest = z.object({ reason: z.string().optional() });
export const OutreachRejectResponse = z.object({
  success: z.boolean(), outreachId: z.string(), status: z.literal("rejected"),
});

// Route Manifest
export const ROUTE_MANIFEST = {
  "POST /api/agents/bell":             { req: BellRingRequest, res: BellRingResponse },
  "GET  /api/agents/stream":           { params: AgentStreamParams, sse: SSEEvent },
  "GET  /api/agents/briefing/[id]":    { res: BriefingResponse },
  "GET  /api/agents/briefing/latest":  { res: LatestBriefingResponse },
  "GET  /api/notifications":           { params: NotificationListParams, res: NotificationListResponse },
  "GET  /api/notifications/stream":    { sse: NotificationSSEEvent },
  "POST /api/notifications/[id]/read": { res: MarkReadResponse },
  "POST /api/outreach/[id]/approve":   { res: OutreachApproveResponse },
  "POST /api/outreach/[id]/reject":    { req: OutreachRejectRequest, res: OutreachRejectResponse },
} as const;
```

---

## 6. UI Component Contracts — `src/contracts/ui.ts`

```ts
import type { z } from "zod/v4";
import type { DepartmentId } from "./events";
import type { SSEEvent, NotificationSSEEvent } from "./api";

export interface BellButtonProps {
  onRing: (prompt?: string) => Promise<string>; // returns executionId
  isRinging: boolean;
  disabled?: boolean;
}

export interface AgentExecutionPanelProps {
  executionId: string | null;
  onClose: () => void;
}

export interface DepartmentStatusRow {
  department: DepartmentId;
  label: string;
  status: "idle" | "running" | "complete" | "error";
  currentStep?: string;
  progress?: number;
  summary?: string;
  durationMs?: number;
}

export interface BriefingCardProps {
  briefingId: string;
  headline: string;
  sections: Array<{
    department: DepartmentId;
    title: string;
    content: string;
    highlights: string[];
    pendingActions: Array<{ description: string; actionType: string; entityId?: string }>;
  }>;
  metrics: { totalTokensUsed: number; totalDurationMs: number; departmentsInvolved: DepartmentId[] };
  createdAt: string;
}

export interface NotificationBellProps {
  unreadCount: number;
}

export interface NotificationItemProps {
  id: string; type: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string; body: string; sourceAgent?: string;
  isRead: boolean;
  actions?: Array<{ label: string; href?: string; action?: string }>;
  createdAt: string;
  onRead: (id: string) => void;
  onAction: (action: string, entityId?: string) => void;
}

export interface OutreachApprovalCardProps {
  outreachId: string; type: string;
  contactName?: string; company?: string;
  subject: string; body: string;
  generatedBy: DepartmentId;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onEdit: (id: string) => void;
}

export interface DashboardBriefingProps {
  latestBriefing: BriefingCardProps | null;
  isLoading: boolean;
  onRingBell: () => void;
}

export interface UseAgentStreamReturn {
  events: Array<z.infer<typeof SSEEvent>>;
  isConnected: boolean;
  error: Error | null;
}

export interface UseNotificationStreamReturn {
  unreadCount: number;
  latestNotification: z.infer<typeof NotificationSSEEvent> | null;
  isConnected: boolean;
}
```

---

## 7. Notification Contracts — `src/contracts/notifications.ts`

```ts
import { z } from "zod/v4";
import { DepartmentId } from "./events";

export const NotificationType = z.enum([
  "agent_started","agent_completed","agent_error",
  "briefing_ready","outreach_pending","outreach_sent",
  "status_change","interview_scheduled","deadline_approaching",
]);

export const PushPayload = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().default("/icons/icc-192.png"),
  badge: z.string().default("/icons/icc-badge.png"),
  tag: z.string(),
  data: z.object({
    url: z.string(),
    notificationId: z.string(),
    type: NotificationType,
  }),
  actions: z.array(z.object({ action: z.string(), title: z.string() })).max(2).optional(),
});

export const PushSubscription = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export const CHANNEL_ROUTING: Record<string, string[]> = {
  briefing_ready:       ["in_app","push"],
  outreach_pending:     ["in_app","push"],
  interview_scheduled:  ["in_app","push"],
  deadline_approaching: ["in_app","push"],
  agent_error:          ["in_app","push"],
  agent_started:        ["in_app"],
  agent_completed:      ["in_app"],
  outreach_sent:        ["in_app"],
  status_change:        ["in_app"],
};
```

---

## 8. Testing Strategy

```
tests/
├── contracts/              # Zod schema validation (good + bad data)
├── unit/
│   ├── agents/             # CEO + CRO logic (mocked LLM)
│   ├── hooks/              # SSE hook behavior
│   └── lib/                # Logger, notification router
├── integration/
│   ├── bell-to-briefing    # Full pipeline
│   ├── outreach-approval   # Draft → approve → send
│   └── sse-delivery        # Events reach browser
└── mocks/
    ├── llm.ts              # Deterministic Vercel AI SDK responses
    ├── inngest.ts          # inngest/test simulated delivery
    ├── db.ts               # In-memory libSQL (:memory:)
    └── push.ts             # Mock Web Push
```

**Rules:**
1. Contracts validated first — 100% coverage, run before anything else
2. LLM always mocked — deterministic, fast, free
3. Inngest tested via `inngest/test` utility (no running server)
4. DB tests use in-memory libSQL
5. SSE tested with ReadableStream mocks
6. Targets: contracts 100%, agents 90%+, API 90%+, UI 80%+

---

## 9. Error Handling — 5 Layers

**L1 — Inngest retries:** 3 attempts, exponential backoff (1s base, 30s cap). On final failure → log to `agentLogs`, send `agent/error`, create critical notification, CEO compiles partial briefing.

**L2 — Agent errors (3 categories):**
- `llm_error` (timeout, rate limit, malformed) → retryable, Inngest handles
- `tool_error` (DB fail, API down) → retry tool call only, not whole agent
- `logic_error` (nonsensical output, safety violation) → not retryable, log + skip in briefing

**L3 — SSE resilience:** Auto-reconnect with exponential backoff. Heartbeat timeout 60s → reconnect. Pause when tab hidden, resume on visible. Clean disconnect on execution complete.

**L4 — Partial briefings:** If any department fails, CEO still compiles with available results. Failed departments get error section. Headline: "Morning Briefing (CRO unavailable)".

**L5 — Outreach safety:** Failed sends revert to `pending_approval`. Never silent-fail. Expired (48h no approval) → auto-reject + notification.

---

## 10. Data Flow Diagrams

### Flow 1: Bell Ring → Briefing

```
User ──POST /api/agents/bell──▶ Route Handler
                                  │ inngest.send("bell/ring")
                                  ▼
User ◀──SSE──────────────────── CEO Agent (Inngest)
  │  agent/start                  │ generateText() → CeoDecision
  │  agent/progress               │ inngest.send("ceo/dispatch")
  │                               ▼
  │◀─ agent/start ────────────── CRO Agent (Inngest)
  │◀─ agent/progress (×N) ─────  │ tool calls against DB
  │◀─ agent/complete ──────────  │ inngest.send("agent/complete")
  │                               ▼
  │◀─ briefing_ready ────────── CEO Compile (Inngest)
  │                               │ writes BriefingSummary to DB
  ▼
GET /api/agents/briefing/[id] → BriefingCard UI
```

### Flow 2: Outreach Approval

```
CRO Agent ──suggestFollowUp()──▶ outreachQueue (pending_approval)
                                  │ inngest.send("outreach/draft")
                                  ▼
                                Notification Handler
                                  │ in_app + push
                                  ▼
User ◀── TopBar Bell + Push ──── notification: "Review email to X"
  │
  ├── POST /api/outreach/[id]/approve
  │     → inngest "outreach/approved"
  │     → Gmail API send
  │     → outreachQueue status="sent"
  │     → notification "Email sent"
  │
  └── POST /api/outreach/[id]/reject
        → outreachQueue status="rejected"
        → notification "Outreach rejected"
```

### Flow 3: Notification Delivery

```
Source ──inngest "notification/create"──▶ Handler
                                          ├── Write to notifications table
                                          ├── SSE push → TopBar Bell
                                          └── Web Push → Browser notification
```

### Flow 4: Scheduled Briefing

```
Inngest Cron (dailyBriefingTime) → "bell/ring" trigger:"scheduled"
                                    → (same as Flow 1)
                                    → Push: "Morning briefing ready"
```

---

## Decisions Log

| Decision | Choice | Why |
|----------|--------|-----|
| AI SDK | Vercel AI SDK v4.x + `@ai-sdk/anthropic` | Provider-swappable, native Zod tools, built-in Next.js streaming |
| Phase 1 scope | CEO + CRO vertical slice | Prove full pipeline with one dept, replicate for others |
| Notifications | In-app (sonner + bell) + Web Push | No Novu dep. Covers foreground + background |
| Blueprint approach | Contract-First | TS contracts = compile-time enforcement. Builders import, can't deviate |
| V1 migration | Complete removal | 26 files on V1. Stubs until Phase 1 rebuild |
| Outreach safety | Approval-required flow | Agents draft, never send. pending_approval → user approves → send |
| Agent logging | Middleware wrapper, not events | Synchronous within Inngest function, writes to agentLogs |
| Agent memory | Direct DB utility | agents call memory.store()/recall() during execution |
| SSE architecture | Two endpoints | Agent stream (per-execution, temporary) + notification stream (always-on) |
| Heartbeat | 30s interval | Prevents Vercel edge function timeout on idle SSE connections |
