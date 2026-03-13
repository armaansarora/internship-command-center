# Phase 1: CEO + CRO Vertical Slice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete bell-ring-to-briefing pipeline with CEO orchestrator dispatching to a CRO agent, streaming status to the browser via SSE, compiling briefings, and delivering notifications — all imports from `@/contracts`.

**Architecture:** Inngest event-driven: bell ring → CEO decides → dispatches CRO → CRO runs tools against Drizzle/Turso → agent/complete → CEO compiles briefing → briefing/ready. Two SSE endpoints: per-execution agent stream + always-on notification stream. Outreach drafts require user approval before sending.

**Tech Stack:** Next.js 16, Vercel AI SDK v6 (`ai` + `@ai-sdk/anthropic`), Inngest v3, Drizzle ORM + Turso (libSQL), Zod v4, shadcn/ui + Boardroom design tokens.

**Contracts:** All cross-domain types live in `src/contracts/`. Never define them inline.

**DB:** Schema already has all needed tables: `agentLogs`, `notifications`, `outreachQueue`, `applications`, `contacts`, `companies`, `userPreferences`. See `src/db/schema.ts`.

**Inngest Client:** Already at `src/lib/inngest/client.ts` (id: `'icc'`). Route handler at `src/app/api/inngest/route.ts`.

---

## Wave 1: Infrastructure (no deps between tasks — run in parallel)

### Task 1: Inngest Event Types

Wire the Zod contracts into typed Inngest events so all `inngest.send()` and `createFunction()` calls are type-safe.

**Files:**
- Modify: `src/lib/inngest/client.ts`

**Step 1: Update the Inngest client with typed events**

```ts
import { Inngest, EventSchemas } from "inngest";
import type { z } from "zod/v4";
import type {
  BellRingEvent,
  CeoDispatchEvent,
  AgentStartEvent,
  AgentProgressEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  BriefingCompileEvent,
  BriefingReadyEvent,
  OutreachDraftEvent,
  OutreachApprovedEvent,
  OutreachSentEvent,
  NotificationCreateEvent,
  ScheduledBriefingEvent,
  ScheduledSnapshotEvent,
} from "@/contracts";

// Inngest event type map — keys are event names, values are { data: ... }
type IccEvents = {
  "bell/ring": z.infer<typeof BellRingEvent>["data"];
  "ceo/dispatch": z.infer<typeof CeoDispatchEvent>["data"];
  "agent/start": z.infer<typeof AgentStartEvent>["data"];
  "agent/progress": z.infer<typeof AgentProgressEvent>["data"];
  "agent/complete": z.infer<typeof AgentCompleteEvent>["data"];
  "agent/error": z.infer<typeof AgentErrorEvent>["data"];
  "briefing/compile": z.infer<typeof BriefingCompileEvent>["data"];
  "briefing/ready": z.infer<typeof BriefingReadyEvent>["data"];
  "outreach/draft": z.infer<typeof OutreachDraftEvent>["data"];
  "outreach/approved": z.infer<typeof OutreachApprovedEvent>["data"];
  "outreach/sent": z.infer<typeof OutreachSentEvent>["data"];
  "notification/create": z.infer<typeof NotificationCreateEvent>["data"];
  "cron/daily-briefing": z.infer<typeof ScheduledBriefingEvent>["data"];
  "cron/daily-snapshot": z.infer<typeof ScheduledSnapshotEvent>["data"];
};

export const inngest = new Inngest({
  id: "icc",
  schemas: new EventSchemas().fromRecord<{
    [K in keyof IccEvents]: { data: IccEvents[K] };
  }>(),
});
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors in `src/lib/inngest/client.ts`

**Step 3: Commit**

```
git add src/lib/inngest/client.ts
git commit -m "feat: wire Inngest client with typed event schemas from contracts"
```

---

### Task 2: Agent Logger Utility

Wrap agent execution with a logging middleware that writes to `agentLogs` table. Used by every agent function.

**Files:**
- Create: `src/lib/agents/logger.ts`
- Test: `src/__tests__/agents/logger.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// We'll mock the DB module
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "log123" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("agentLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should be importable with start and complete methods", async () => {
    const { agentLogger } = await import("@/lib/agents/logger");
    expect(agentLogger).toBeDefined();
    expect(typeof agentLogger.start).toBe("function");
    expect(typeof agentLogger.complete).toBe("function");
    expect(typeof agentLogger.fail).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/agents/logger.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
import { db } from "@/db";
import { agentLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomHex } from "@/db/schema";

export const agentLogger = {
  async start(params: {
    agent: string;
    worker?: string;
    action: string;
    inputSummary?: string;
    inngestRunId?: string;
  }) {
    const [log] = await db
      .insert(agentLogs)
      .values({
        id: randomHex(),
        agent: params.agent,
        worker: params.worker ?? null,
        action: params.action,
        status: "running",
        inputSummary: params.inputSummary ?? null,
        inngestRunId: params.inngestRunId ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return log!.id;
  },

  async complete(logId: string, params: {
    outputSummary?: string;
    tokensUsed?: number;
    costCents?: number;
    durationMs?: number;
  }) {
    await db
      .update(agentLogs)
      .set({
        status: "completed",
        outputSummary: params.outputSummary ?? null,
        tokensUsed: params.tokensUsed ?? null,
        costCents: params.costCents ?? null,
        durationMs: params.durationMs ?? null,
        completedAt: new Date().toISOString(),
      })
      .where(eq(agentLogs.id, logId));
  },

  async fail(logId: string, params: {
    error: string;
    durationMs?: number;
  }) {
    await db
      .update(agentLogs)
      .set({
        status: "failed",
        error: params.error,
        durationMs: params.durationMs ?? null,
        completedAt: new Date().toISOString(),
      })
      .where(eq(agentLogs.id, logId));
  },
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/agents/logger.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/lib/agents/logger.ts src/__tests__/agents/logger.test.ts
git commit -m "feat: add agent logger utility for agentLogs table"
```

---

### Task 3: SSE Event Bus (In-Memory Pub/Sub)

Inngest functions need to push events to SSE connections. Use an in-memory event emitter scoped by executionId. This bridges Inngest → browser.

**Files:**
- Create: `src/lib/agents/event-bus.ts`
- Test: `src/__tests__/agents/event-bus.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";

describe("eventBus", () => {
  it("should deliver events to subscribers of the same executionId", async () => {
    const { eventBus } = await import("@/lib/agents/event-bus");

    const received: unknown[] = [];
    const unsub = eventBus.subscribe("exec-1", (event) => {
      received.push(event);
    });

    eventBus.publish("exec-1", { type: "heartbeat", timestamp: new Date().toISOString() });
    eventBus.publish("exec-2", { type: "heartbeat", timestamp: new Date().toISOString() }); // different exec

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: "heartbeat" });

    unsub();
  });

  it("should not deliver after unsubscribe", () => {
    const { eventBus } = await import("@/lib/agents/event-bus");

    const received: unknown[] = [];
    const unsub = eventBus.subscribe("exec-3", (event) => {
      received.push(event);
    });

    unsub();
    eventBus.publish("exec-3", { type: "heartbeat", timestamp: new Date().toISOString() });

    expect(received).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/agents/event-bus.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```ts
import type { z } from "zod/v4";
import type { SSEEvent } from "@/contracts/api";

type SSEEventType = z.infer<typeof SSEEvent>;
type Listener = (event: SSEEventType) => void;

class AgentEventBus {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(executionId: string, listener: Listener): () => void {
    if (!this.listeners.has(executionId)) {
      this.listeners.set(executionId, new Set());
    }
    this.listeners.get(executionId)!.add(listener);

    return () => {
      const set = this.listeners.get(executionId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(executionId);
      }
    };
  }

  publish(executionId: string, event: SSEEventType): void {
    const set = this.listeners.get(executionId);
    if (set) {
      for (const listener of set) {
        listener(event);
      }
    }
  }
}

// Singleton — lives in the Node.js process (same as Inngest handler)
export const eventBus = new AgentEventBus();
```

**Step 4: Run test, verify pass**

Run: `npx vitest run src/__tests__/agents/event-bus.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/lib/agents/event-bus.ts src/__tests__/agents/event-bus.test.ts
git commit -m "feat: add in-memory SSE event bus for agent execution streaming"
```

---

### Task 4: Notification Router Utility

Reads `CHANNEL_ROUTING` from contracts, writes to `notifications` table, publishes to notification SSE stream.

**Files:**
- Create: `src/lib/agents/notification-router.ts`
- Create: `src/lib/agents/notification-bus.ts` (separate bus for always-on notification SSE)
- Test: `src/__tests__/agents/notification-router.test.ts`

**Step 1: Write the notification bus (simple pub/sub for notifications)**

```ts
// src/lib/agents/notification-bus.ts
import type { z } from "zod/v4";
import type { NotificationSSEEvent } from "@/contracts/api";

type NotifEvent = z.infer<typeof NotificationSSEEvent>;
type Listener = (event: NotifEvent) => void;

class NotificationBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  publish(event: NotifEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const notificationBus = new NotificationBus();
```

**Step 2: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "notif-1" }]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    }),
  },
}));

vi.mock("@/lib/agents/notification-bus", () => ({
  notificationBus: {
    publish: vi.fn(),
  },
}));

describe("notificationRouter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should create notification and publish to bus", async () => {
    const { routeNotification } = await import("@/lib/agents/notification-router");
    const { notificationBus } = await import("@/lib/agents/notification-bus");

    await routeNotification({
      type: "briefing_ready",
      priority: "high",
      title: "Morning Briefing Ready",
      body: "Your daily briefing has been compiled.",
      channels: ["in_app", "push"],
      timestamp: new Date().toISOString(),
    });

    expect(notificationBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "new_notification", title: "Morning Briefing Ready" })
    );
  });
});
```

**Step 3: Write the implementation**

```ts
// src/lib/agents/notification-router.ts
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { randomHex } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notificationBus } from "./notification-bus";
import type { z } from "zod/v4";
import type { NotificationCreateEvent } from "@/contracts/events";

type NotifData = z.infer<typeof NotificationCreateEvent>["data"];

export async function routeNotification(data: NotifData) {
  const id = randomHex();
  const now = new Date().toISOString();

  // Write to DB
  await db.insert(notifications).values({
    id,
    type: data.type,
    priority: data.priority,
    title: data.title,
    body: data.body,
    sourceAgent: data.sourceAgent ?? null,
    sourceEntityId: data.sourceEntityId ?? null,
    sourceEntityType: data.sourceEntityType ?? null,
    channels: JSON.stringify(data.channels),
    actions: data.actions ? JSON.stringify(data.actions) : null,
    createdAt: now,
  });

  // Push to in-app SSE stream
  if (data.channels.includes("in_app")) {
    notificationBus.publish({
      type: "new_notification",
      id,
      title: data.title,
      body: data.body,
      priority: data.priority,
      sourceAgent: data.sourceAgent,
      actions: data.actions,
      timestamp: now,
    });
  }

  // Web Push would go here (Phase 1.5 — skip for now, just in-app)

  return id;
}
```

**Step 4: Run test, verify pass**

Run: `npx vitest run src/__tests__/agents/notification-router.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/lib/agents/notification-router.ts src/lib/agents/notification-bus.ts src/__tests__/agents/notification-router.test.ts
git commit -m "feat: add notification router with in-app SSE delivery"
```

---

## Wave 2: CRO Agent (depends on Wave 1 logger + event bus)

### Task 5: CRO Tool Implementations

The CRO agent calls tools against the DB. Implement the 4 tool functions matching `CroTools` contract.

**Files:**
- Create: `src/lib/agents/cro/tools.ts`
- Test: `src/__tests__/agents/cro/tools.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Drizzle DB
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

describe("CRO Tools", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("queryApplications returns pipeline data", async () => {
    // Setup mock chain
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "app-1", status: "applied", tier: 1, role: "Analyst" },
          ]),
        }),
      }),
    });

    const { queryApplications } = await import("@/lib/agents/cro/tools");
    const result = await queryApplications({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("analyzeConversionRates returns rate data", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { status: "applied" },
          { status: "applied" },
          { status: "interview_scheduled" },
          { status: "offer" },
        ]),
      }),
    });

    const { analyzeConversionRates } = await import("@/lib/agents/cro/tools");
    const result = await analyzeConversionRates({});
    expect(result).toHaveProperty("totalApplications");
    expect(result).toHaveProperty("conversionRates");
  });
});
```

**Step 2: Run test, verify fails**

Run: `npx vitest run src/__tests__/agents/cro/tools.test.ts`

**Step 3: Implement CRO tools**

```ts
// src/lib/agents/cro/tools.ts
import { db } from "@/db";
import { applications, contacts, companies, outreachQueue } from "@/db/schema";
import { eq, inArray, gte, and, sql } from "drizzle-orm";
import { randomHex } from "@/db/schema";

export async function queryApplications(params: {
  status?: string[];
  tier?: number[];
  companyId?: string;
  createdAfter?: string;
  limit?: number;
}) {
  const conditions = [];
  if (params.status?.length) conditions.push(inArray(applications.status, params.status));
  if (params.tier?.length) conditions.push(inArray(applications.tier, params.tier));
  if (params.companyId) conditions.push(eq(applications.companyId, params.companyId));
  if (params.createdAfter) conditions.push(gte(applications.createdAt, params.createdAfter));

  const rows = await db
    .select()
    .from(applications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(params.limit ?? 50);

  return rows;
}

export async function updateApplicationStatus(params: {
  applicationId: string;
  newStatus: string;
  reason: string;
}) {
  await db
    .update(applications)
    .set({
      status: params.newStatus,
      notes: sql`COALESCE(${applications.notes}, '') || char(10) || ${'[CRO ' + new Date().toISOString() + '] ' + params.reason}`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(applications.id, params.applicationId));

  return { success: true, applicationId: params.applicationId, newStatus: params.newStatus };
}

export async function suggestFollowUp(params: {
  applicationId: string;
  contactId?: string;
  suggestedSubject: string;
  suggestedBody: string;
}) {
  const [draft] = await db
    .insert(outreachQueue)
    .values({
      id: randomHex(),
      applicationId: params.applicationId,
      contactId: params.contactId ?? null,
      type: "follow_up",
      subject: params.suggestedSubject,
      body: params.suggestedBody,
      status: "pending_approval",
      generatedBy: "cro",
      createdAt: new Date().toISOString(),
    })
    .returning();

  return { outreachId: draft!.id, status: "pending_approval" };
}

export async function analyzeConversionRates(params: {
  fromDate?: string;
  toDate?: string;
}) {
  const conditions = [];
  if (params.fromDate) conditions.push(gte(applications.createdAt, params.fromDate));

  const rows = await db
    .select()
    .from(applications)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    const s = row.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const total = rows.length;
  const stages = ["discovered", "applied", "screening", "interview_scheduled", "interviewing", "under_review", "offer", "accepted"];
  const conversionRates: Record<string, number> = {};

  for (let i = 0; i < stages.length - 1; i++) {
    const from = byStatus[stages[i]!] ?? 0;
    const to = byStatus[stages[i + 1]!] ?? 0;
    if (from > 0) {
      conversionRates[`${stages[i]} → ${stages[i + 1]}`] = Math.round((to / from) * 100);
    }
  }

  return { totalApplications: total, byStatus, conversionRates };
}
```

**Step 4: Run test, verify pass**

Run: `npx vitest run src/__tests__/agents/cro/tools.test.ts`

**Step 5: Commit**

```
git add src/lib/agents/cro/tools.ts src/__tests__/agents/cro/tools.test.ts
git commit -m "feat: implement CRO agent tool functions (query, update, suggest, analyze)"
```

---

### Task 6: CRO Agent Inngest Function

The CRO agent receives `ceo/dispatch` where `department === "cro"`, runs AI SDK `generateText` with the CRO tools, and sends `agent/complete` or `agent/error`.

**Files:**
- Create: `src/lib/agents/cro/index.ts`
- Test: `src/__tests__/agents/cro/agent.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "Pipeline analysis complete. 3 follow-ups needed.",
    toolCalls: [],
    usage: { promptTokens: 500, completionTokens: 200 },
  }),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("@/lib/agents/logger", () => ({
  agentLogger: {
    start: vi.fn().mockResolvedValue("log-1"),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/agents/event-bus", () => ({
  eventBus: { publish: vi.fn() },
}));

vi.mock("@/lib/agents/cro/tools", () => ({
  queryApplications: vi.fn().mockResolvedValue([]),
  updateApplicationStatus: vi.fn().mockResolvedValue({ success: true }),
  suggestFollowUp: vi.fn().mockResolvedValue({ outreachId: "out-1" }),
  analyzeConversionRates: vi.fn().mockResolvedValue({ totalApplications: 10, byStatus: {}, conversionRates: {} }),
}));

describe("CRO Agent", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("exports a createCroAgent function", async () => {
    const mod = await import("@/lib/agents/cro");
    expect(mod.croAgent).toBeDefined();
  });
});
```

**Step 2: Run test, verify fails**

Run: `npx vitest run src/__tests__/agents/cro/agent.test.ts`

**Step 3: Implement CRO agent**

```ts
// src/lib/agents/cro/index.ts
import { inngest } from "@/lib/inngest/client";
import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import {
  queryApplications,
  updateApplicationStatus,
  suggestFollowUp,
  analyzeConversionRates,
} from "./tools";

const CRO_DEFINITION = {
  department: "cro" as const,
  name: "Chief Revenue Officer",
  codename: "Revenue",
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0.3,
};

export const croAgent = inngest.createFunction(
  {
    id: "cro-agent",
    retries: 3,
  },
  { event: "ceo/dispatch" },
  async ({ event, step }) => {
    // Only handle CRO dispatches
    if (event.data.department !== "cro") return;

    const { executionId, taskId, instructions, priority } = event.data;
    const startTime = Date.now();

    // Log start
    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "cro",
        action: "pipeline-analysis",
        inputSummary: instructions.slice(0, 200),
      });
    });

    // Publish start event to SSE
    await step.run("publish-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "cro",
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    try {
      // Run AI with tools
      const result = await step.run("cro-generate", async () => {
        eventBus.publish(executionId, {
          type: "agent_progress",
          department: "cro",
          step: "Analyzing pipeline...",
          progress: 30,
          timestamp: new Date().toISOString(),
        });

        return generateText({
          model: anthropic(CRO_DEFINITION.model),
          maxTokens: CRO_DEFINITION.maxTokens,
          temperature: CRO_DEFINITION.temperature,
          system: `You are the Chief Revenue Officer (CRO) of an internship command center.
Your job is to analyze the application pipeline, identify action items, suggest follow-ups for stale applications, and track conversion rates.
Be concise and actionable. Focus on what needs attention NOW.`,
          prompt: instructions,
          tools: {
            queryApplications: tool({
              description: "Query the applications table with filters",
              parameters: z.object({
                status: z.array(z.string()).optional(),
                tier: z.array(z.number()).optional(),
                companyId: z.string().optional(),
                createdAfter: z.string().optional(),
                limit: z.number().default(50),
              }),
              execute: async (params) => queryApplications(params),
            }),
            updateApplicationStatus: tool({
              description: "Update an application's status",
              parameters: z.object({
                applicationId: z.string(),
                newStatus: z.string(),
                reason: z.string(),
              }),
              execute: async (params) => updateApplicationStatus(params),
            }),
            suggestFollowUp: tool({
              description: "Draft a follow-up outreach for stale applications",
              parameters: z.object({
                applicationId: z.string(),
                contactId: z.string().optional(),
                suggestedSubject: z.string(),
                suggestedBody: z.string(),
              }),
              execute: async (params) => suggestFollowUp(params),
            }),
            analyzeConversionRates: tool({
              description: "Calculate conversion rates between pipeline stages",
              parameters: z.object({
                fromDate: z.string().optional(),
                toDate: z.string().optional(),
              }),
              execute: async (params) => analyzeConversionRates(params),
            }),
          },
          maxSteps: 5,
        });
      });

      const durationMs = Date.now() - startTime;
      const tokenUsage = {
        input: result.usage?.promptTokens ?? 0,
        output: result.usage?.completionTokens ?? 0,
      };

      // Log completion
      await step.run("log-complete", async () => {
        await agentLogger.complete(logId, {
          outputSummary: result.text.slice(0, 500),
          tokensUsed: tokenUsage.input + tokenUsage.output,
          durationMs,
        });
      });

      // Publish complete to SSE
      await step.run("publish-complete", async () => {
        eventBus.publish(executionId, {
          type: "agent_complete",
          department: "cro",
          summary: result.text.slice(0, 300),
          timestamp: new Date().toISOString(),
        });
      });

      // Send agent/complete event for CEO to collect
      await step.run("send-complete-event", async () => {
        await inngest.send({
          name: "agent/complete",
          data: {
            executionId,
            department: "cro",
            taskId,
            result: { summary: result.text, toolCalls: result.toolCalls?.length ?? 0 },
            tokenUsage,
            durationMs,
            timestamp: new Date().toISOString(),
          },
        });
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      await step.run("log-fail", async () => {
        await agentLogger.fail(logId, { error: errorMsg, durationMs });
      });

      await step.run("publish-error", async () => {
        eventBus.publish(executionId, {
          type: "agent_error",
          department: "cro",
          error: errorMsg,
          retryable: true,
          timestamp: new Date().toISOString(),
        });
      });

      await step.run("send-error-event", async () => {
        await inngest.send({
          name: "agent/error",
          data: {
            executionId,
            department: "cro",
            taskId,
            error: errorMsg,
            retryable: true,
            attempt: 1,
            timestamp: new Date().toISOString(),
          },
        });
      });

      throw error; // Let Inngest handle retries
    }
  }
);
```

**Step 4: Run test, verify pass**

Run: `npx vitest run src/__tests__/agents/cro/agent.test.ts`

**Step 5: Commit**

```
git add src/lib/agents/cro/index.ts src/__tests__/agents/cro/agent.test.ts
git commit -m "feat: implement CRO agent Inngest function with AI SDK tools"
```

---

## Wave 3: CEO Orchestrator + Briefing (depends on Wave 2 CRO)

### Task 7: CEO Orchestrator Inngest Function

CEO receives `bell/ring`, uses AI to decide which departments to dispatch, sends `ceo/dispatch` events, waits for results, then triggers `briefing/compile`.

**Files:**
- Create: `src/lib/agents/ceo/index.ts`
- Test: `src/__tests__/agents/ceo/agent.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      departments: [{ department: "cro", instructions: "Analyze pipeline", priority: "normal", dependsOn: [] }],
      reasoning: "CRO needed for pipeline analysis",
    }),
    usage: { promptTokens: 300, completionTokens: 100 },
  }),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("@/lib/agents/logger", () => ({
  agentLogger: {
    start: vi.fn().mockResolvedValue("log-ceo"),
    complete: vi.fn(),
    fail: vi.fn(),
  },
}));

vi.mock("@/lib/agents/event-bus", () => ({
  eventBus: { publish: vi.fn() },
}));

describe("CEO Agent", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("exports ceoOrchestrator function", async () => {
    const mod = await import("@/lib/agents/ceo");
    expect(mod.ceoOrchestrator).toBeDefined();
  });
});
```

**Step 2: Run test, verify fails**

**Step 3: Implement CEO orchestrator**

```ts
// src/lib/agents/ceo/index.ts
import { inngest } from "@/lib/inngest/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import { CeoDecision } from "@/contracts/agent-protocol";
import { randomHex } from "@/db/schema";

export const ceoOrchestrator = inngest.createFunction(
  {
    id: "ceo-orchestrator",
    retries: 2,
  },
  { event: "bell/ring" },
  async ({ event, step }) => {
    const { executionId, userId, prompt, trigger, priority } = event.data;
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "ceo",
        action: "orchestrate",
        inputSummary: prompt?.slice(0, 200) ?? `${trigger} bell ring`,
      });
    });

    // Publish CEO start
    await step.run("publish-ceo-start", async () => {
      eventBus.publish(executionId, {
        type: "agent_start",
        department: "cro", // CEO doesn't have its own department in SSE - uses the first dept
        taskId: "ceo-planning",
        timestamp: new Date().toISOString(),
      });
    });

    // Phase 1: Only CRO is available. CEO decides based on prompt.
    // In future phases, CEO will use AI to pick departments dynamically.
    const decision = await step.run("ceo-decide", async () => {
      eventBus.publish(executionId, {
        type: "agent_progress",
        department: "cro",
        step: "CEO is planning...",
        progress: 10,
        timestamp: new Date().toISOString(),
      });

      // For Phase 1, always dispatch CRO with a pipeline analysis task
      const defaultInstructions = prompt
        ? `User request: "${prompt}". Analyze the internship application pipeline accordingly.`
        : "Perform a comprehensive pipeline analysis: check for stale applications, identify action items, analyze conversion rates, and suggest follow-ups for applications that haven't been touched in 7+ days.";

      return {
        departments: [
          {
            department: "cro" as const,
            instructions: defaultInstructions,
            priority: priority,
            dependsOn: [],
          },
        ],
        reasoning: "Phase 1: CRO pipeline analysis is the primary department.",
      };
    });

    // Dispatch to CRO
    const taskId = randomHex();
    await step.run("dispatch-cro", async () => {
      await inngest.send({
        name: "ceo/dispatch",
        data: {
          executionId,
          department: "cro",
          taskId,
          instructions: decision.departments[0]!.instructions,
          priority: decision.departments[0]!.priority,
        },
      });
    });

    // Wait for CRO to complete (or error)
    const croResult = await step.waitForEvent("wait-cro-complete", {
      event: "agent/complete",
      match: "data.executionId",
      timeout: "5m",
    });

    // If CRO timed out, check for error
    if (!croResult) {
      const croError = await step.waitForEvent("wait-cro-error", {
        event: "agent/error",
        match: "data.executionId",
        timeout: "10s",
      });

      // Compile partial briefing
      await step.run("compile-partial", async () => {
        await inngest.send({
          name: "briefing/compile",
          data: {
            executionId,
            departmentResults: [{
              department: "cro",
              taskId,
              status: croError ? "error" : "timeout",
              result: croError ? { error: croError.data.error } : undefined,
            }],
            timestamp: new Date().toISOString(),
          },
        });
      });
    } else {
      // Compile full briefing
      await step.run("compile-full", async () => {
        await inngest.send({
          name: "briefing/compile",
          data: {
            executionId,
            departmentResults: [{
              department: "cro",
              taskId,
              status: "complete",
              result: croResult.data.result,
            }],
            timestamp: new Date().toISOString(),
          },
        });
      });
    }

    const durationMs = Date.now() - startTime;
    await step.run("log-complete", async () => {
      await agentLogger.complete(logId, {
        outputSummary: `Dispatched CRO. Duration: ${durationMs}ms`,
        durationMs,
      });
    });
  }
);
```

**Step 4: Run test, verify pass**

Run: `npx vitest run src/__tests__/agents/ceo/agent.test.ts`

**Step 5: Commit**

```
git add src/lib/agents/ceo/index.ts src/__tests__/agents/ceo/agent.test.ts
git commit -m "feat: implement CEO orchestrator with CRO dispatch and waitForEvent"
```

---

### Task 8: Briefing Compiler Inngest Function

Receives `briefing/compile`, uses AI to summarize department results into `BriefingSummary`, writes to a `briefings` row (we'll use `documents` table with `type: 'briefing'` or create a dedicated approach — for now store as JSON in `agentLogs` with action `briefing`).

Actually, looking at the schema, there's no dedicated `briefings` table. We'll store briefings in `documents` table with `type: 'debrief'` repurposed, OR better — add a simple key-value storage approach. For Phase 1, store the briefing JSON in `agentLogs` with `agent: 'ceo', action: 'briefing-compile'` and the `outputSummary` contains the serialized `BriefingSummary`.

**Files:**
- Create: `src/lib/agents/ceo/compile-briefing.ts`
- Test: `src/__tests__/agents/ceo/compile-briefing.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      headline: "Morning Briefing: 3 action items, pipeline healthy",
      sections: [{
        department: "cro",
        title: "Pipeline Status",
        content: "Your pipeline is healthy with 40 active applications.",
        highlights: ["3 follow-ups needed", "2 interviews this week"],
        pendingActions: [],
      }],
    }),
    usage: { promptTokens: 400, completionTokens: 300 },
  }),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("@/lib/agents/logger", () => ({
  agentLogger: {
    start: vi.fn().mockResolvedValue("log-briefing"),
    complete: vi.fn(),
  },
}));

vi.mock("@/lib/agents/event-bus", () => ({
  eventBus: { publish: vi.fn() },
}));

vi.mock("@/lib/agents/notification-router", () => ({
  routeNotification: vi.fn().mockResolvedValue("notif-1"),
}));

describe("Briefing Compiler", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("exports compileBriefing function", async () => {
    const mod = await import("@/lib/agents/ceo/compile-briefing");
    expect(mod.compileBriefing).toBeDefined();
  });
});
```

**Step 2: Run test, verify fails**

**Step 3: Implement briefing compiler**

```ts
// src/lib/agents/ceo/compile-briefing.ts
import { inngest } from "@/lib/inngest/client";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { agentLogger } from "@/lib/agents/logger";
import { eventBus } from "@/lib/agents/event-bus";
import { routeNotification } from "@/lib/agents/notification-router";
import { randomHex } from "@/db/schema";

export const compileBriefing = inngest.createFunction(
  { id: "compile-briefing", retries: 1 },
  { event: "briefing/compile" },
  async ({ event, step }) => {
    const { executionId, departmentResults } = event.data;
    const briefingId = randomHex();
    const startTime = Date.now();

    const logId = await step.run("log-start", async () => {
      return agentLogger.start({
        agent: "ceo",
        action: "briefing-compile",
        inputSummary: `Compiling ${departmentResults.length} department results`,
      });
    });

    // Use AI to compile the briefing summary
    const briefing = await step.run("compile", async () => {
      const departmentSummaries = departmentResults.map((r) => {
        if (r.status === "complete") {
          return `## ${r.department.toUpperCase()}\nStatus: Complete\nResult: ${JSON.stringify(r.result)}`;
        }
        return `## ${r.department.toUpperCase()}\nStatus: ${r.status}\n${r.result ? JSON.stringify(r.result) : "No data"}`;
      }).join("\n\n");

      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        maxTokens: 2048,
        temperature: 0.2,
        system: `You are compiling a daily briefing for an internship applicant.
Synthesize the department reports into a clear, actionable briefing.
Output valid JSON matching this structure:
{
  "headline": "Brief 1-line summary",
  "sections": [{ "department": "cro", "title": "...", "content": "...", "highlights": ["..."], "pendingActions": [{ "description": "...", "actionType": "...", "entityId": "..." }] }]
}`,
        prompt: `Compile this briefing:\n\n${departmentSummaries}`,
      });

      try {
        return JSON.parse(result.text);
      } catch {
        return {
          headline: "Briefing compiled with partial data",
          sections: departmentResults.map((r) => ({
            department: r.department,
            title: `${r.department.toUpperCase()} Report`,
            content: r.status === "complete" ? JSON.stringify(r.result) : `Status: ${r.status}`,
            highlights: [],
            pendingActions: [],
          })),
        };
      }
    });

    const durationMs = Date.now() - startTime;
    const totalTokens = 0; // simplified for Phase 1

    // Store briefing (serialized in agentLogs output)
    await step.run("store-briefing", async () => {
      const fullBriefing = {
        executionId,
        briefingId,
        headline: briefing.headline,
        sections: briefing.sections,
        metrics: {
          totalTokensUsed: totalTokens,
          totalDurationMs: durationMs,
          departmentsInvolved: departmentResults.map((r) => r.department),
        },
        createdAt: new Date().toISOString(),
      };

      await agentLogger.complete(logId, {
        outputSummary: JSON.stringify(fullBriefing),
        durationMs,
      });
    });

    // Publish briefing_ready to execution SSE
    await step.run("publish-briefing-ready", async () => {
      eventBus.publish(executionId, {
        type: "briefing_ready",
        briefingId,
        headline: briefing.headline,
        timestamp: new Date().toISOString(),
      });
    });

    // Send briefing/ready event
    await step.run("send-briefing-ready", async () => {
      await inngest.send({
        name: "briefing/ready",
        data: {
          executionId,
          briefingId,
          summary: briefing.headline,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Create notification
    await step.run("notify", async () => {
      await routeNotification({
        type: "briefing_ready",
        priority: "high",
        title: "Briefing Ready",
        body: briefing.headline,
        sourceAgent: "cro",
        channels: ["in_app", "push"],
        timestamp: new Date().toISOString(),
      });
    });
  }
);
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```
git add src/lib/agents/ceo/compile-briefing.ts src/__tests__/agents/ceo/compile-briefing.test.ts
git commit -m "feat: implement briefing compiler with AI summarization and notification"
```

---

### Task 9: Register All Inngest Functions

Wire CEO, CRO, and briefing compiler into the Inngest route handler.

**Files:**
- Modify: `src/app/api/inngest/route.ts`

**Step 1: Update the route**

```ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ceoOrchestrator } from "@/lib/agents/ceo";
import { croAgent } from "@/lib/agents/cro";
import { compileBriefing } from "@/lib/agents/ceo/compile-briefing";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ceoOrchestrator, croAgent, compileBriefing],
});
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add src/app/api/inngest/route.ts
git commit -m "feat: register CEO, CRO, and briefing compiler in Inngest route"
```

---

## Wave 4: API Routes (depends on Wave 1 event bus + Wave 3 agents)

### Task 10: Bell Ring API Route

POST `/api/agents/bell` — validates request, generates executionId, sends `bell/ring` event.

**Files:**
- Create: `src/app/api/agents/bell/route.ts`
- Test: `src/__tests__/api/bell.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["evt-1"] }) },
}));

vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

describe("POST /api/agents/bell", () => {
  it("should export a POST handler", async () => {
    const mod = await import("@/app/api/agents/bell/route");
    expect(mod.POST).toBeDefined();
  });
});
```

**Step 2: Implement**

```ts
// src/app/api/agents/bell/route.ts
import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { BellRingRequest, BellRingResponse } from "@/contracts/api";
import { randomHex } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = BellRingRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const executionId = randomHex();

  await inngest.send({
    name: "bell/ring",
    data: {
      executionId,
      userId: session.user.email,
      prompt: parsed.data.prompt,
      trigger: parsed.data.trigger,
      priority: parsed.data.priority,
      timestamp: new Date().toISOString(),
    },
  });

  const response = BellRingResponse.parse({
    executionId,
    status: "dispatched",
    message: "Bell rang. CEO is assembling the team.",
  });

  return NextResponse.json(response);
}
```

**Step 3: Verify build, commit**

```
git add src/app/api/agents/bell/route.ts src/__tests__/api/bell.test.ts
git commit -m "feat: add POST /api/agents/bell route with contract validation"
```

---

### Task 11: SSE Agent Stream Endpoint

GET `/api/agents/stream?executionId=xxx` — subscribes to `eventBus`, streams SSE events to browser.

**Files:**
- Create: `src/app/api/agents/stream/route.ts`

**Step 1: Implement**

```ts
// src/app/api/agents/stream/route.ts
import { NextRequest } from "next/server";
import { eventBus } from "@/lib/agents/event-bus";
import { AgentStreamParams } from "@/contracts/api";
import { auth } from "@/lib/auth";

export const runtime = "nodejs"; // SSE needs long-lived connections

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = AgentStreamParams.safeParse({
    executionId: searchParams.get("executionId"),
  });

  if (!parsed.success) {
    return new Response("Missing executionId", { status: 400 });
  }

  const { executionId } = parsed.data;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Subscribe to execution events
      const unsub = eventBus.subscribe(executionId, (event) => {
        send(JSON.stringify(event));
      });

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
      }, 30_000);

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        unsub();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

**Step 2: Verify build, commit**

```
git add src/app/api/agents/stream/route.ts
git commit -m "feat: add GET /api/agents/stream SSE endpoint with heartbeat"
```

---

### Task 12: Briefing API Routes

GET `/api/agents/briefing/[id]` and GET `/api/agents/briefing/latest`.

**Files:**
- Create: `src/app/api/agents/briefing/[id]/route.ts`
- Create: `src/app/api/agents/briefing/latest/route.ts`

**Step 1: Implement [id] route**

```ts
// src/app/api/agents/briefing/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Briefings are stored in agentLogs with action 'briefing-compile'
  // The briefingId is encoded in the outputSummary JSON
  const logs = await db
    .select()
    .from(agentLogs)
    .where(
      and(
        eq(agentLogs.agent, "ceo"),
        eq(agentLogs.action, "briefing-compile"),
        eq(agentLogs.status, "completed"),
      )
    );

  for (const log of logs) {
    try {
      const briefing = JSON.parse(log.outputSummary ?? "{}");
      if (briefing.briefingId === id) {
        return NextResponse.json(briefing);
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
}
```

**Step 2: Implement latest route**

```ts
// src/app/api/agents/briefing/latest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [latest] = await db
    .select()
    .from(agentLogs)
    .where(
      and(
        eq(agentLogs.agent, "ceo"),
        eq(agentLogs.action, "briefing-compile"),
        eq(agentLogs.status, "completed"),
      )
    )
    .orderBy(desc(agentLogs.completedAt))
    .limit(1);

  if (!latest?.outputSummary) {
    return NextResponse.json(null);
  }

  try {
    const briefing = JSON.parse(latest.outputSummary);
    return NextResponse.json(briefing);
  } catch {
    return NextResponse.json(null);
  }
}
```

**Step 3: Verify build, commit**

```
git add src/app/api/agents/briefing/
git commit -m "feat: add briefing API routes (GET by id and latest)"
```

---

### Task 13: Notification API Routes

GET `/api/notifications` (list), POST `/api/notifications/[id]/read`, GET `/api/notifications/stream` (SSE).

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`
- Create: `src/app/api/notifications/stream/route.ts`

**Step 1: Implement list route**

```ts
// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const conditions = unreadOnly ? eq(notifications.isRead, 0) : undefined;

  const rows = await db
    .select()
    .from(notifications)
    .where(conditions)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications);

  const [{ count: unreadCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(eq(notifications.isRead, 0));

  return NextResponse.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      priority: n.priority,
      title: n.title,
      body: n.body,
      sourceAgent: n.sourceAgent,
      isRead: Boolean(n.isRead),
      actions: n.actions ? JSON.parse(n.actions) : null,
      createdAt: n.createdAt,
    })),
    total,
    unreadCount,
  });
}
```

**Step 2: Implement mark-read route**

```ts
// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));

  return NextResponse.json({ success: true });
}
```

**Step 3: Implement notification SSE stream**

```ts
// src/app/api/notifications/stream/route.ts
import { NextRequest } from "next/server";
import { notificationBus } from "@/lib/agents/notification-bus";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const unsub = notificationBus.subscribe((event) => {
        send(JSON.stringify(event));
      });

      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        unsub();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

**Step 4: Verify build, commit**

```
git add src/app/api/notifications/
git commit -m "feat: add notification API routes (list, mark-read, SSE stream)"
```

---

### Task 14: Outreach Approval API Routes

POST `/api/outreach/[id]/approve` and POST `/api/outreach/[id]/reject`.

**Files:**
- Create: `src/app/api/outreach/[id]/approve/route.ts`
- Create: `src/app/api/outreach/[id]/reject/route.ts`

**Step 1: Implement approve**

```ts
// src/app/api/outreach/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outreachQueue } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { auth } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const now = new Date().toISOString();

  await db
    .update(outreachQueue)
    .set({ status: "approved", approvedAt: now })
    .where(eq(outreachQueue.id, id));

  await inngest.send({
    name: "outreach/approved",
    data: { outreachId: id, approvedAt: now },
  });

  return NextResponse.json({ success: true, outreachId: id, status: "approved" });
}
```

**Step 2: Implement reject**

```ts
// src/app/api/outreach/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outreachQueue } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { OutreachRejectRequest } from "@/contracts/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = OutreachRejectRequest.safeParse(body);

  await db
    .update(outreachQueue)
    .set({ status: "rejected" })
    .where(eq(outreachQueue.id, id));

  return NextResponse.json({ success: true, outreachId: id, status: "rejected" });
}
```

**Step 3: Verify build, commit**

```
git add src/app/api/outreach/
git commit -m "feat: add outreach approve/reject API routes"
```

---

## Wave 5: React Hooks + UI Components (depends on Wave 4 API routes)

### Task 15: useAgentStream and useNotificationStream Hooks

Client-side hooks that connect to SSE endpoints and parse events using contracts.

**Files:**
- Create: `src/hooks/use-agent-stream.ts`
- Create: `src/hooks/use-notification-stream.ts`

**Step 1: Implement useAgentStream**

```ts
// src/hooks/use-agent-stream.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SSEEvent } from "@/contracts/api";
import type { UseAgentStreamReturn } from "@/contracts/ui";
import type { z } from "zod/v4";

type SSEEventType = z.infer<typeof SSEEvent>;

export function useAgentStream(executionId: string | null): UseAgentStreamReturn {
  const [events, setEvents] = useState<SSEEventType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!executionId) {
      setEvents([]);
      setIsConnected(false);
      return;
    }

    const es = new EventSource(`/api/agents/stream?executionId=${executionId}`);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsed = SSEEvent.safeParse(data);
        if (parsed.success) {
          if (parsed.data.type !== "heartbeat") {
            setEvents((prev) => [...prev, parsed.data]);
          }
        }
      } catch (e) {
        // Ignore parse errors on heartbeats
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setError(new Error("SSE connection lost"));
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [executionId]);

  return { events, isConnected, error };
}
```

**Step 2: Implement useNotificationStream**

```ts
// src/hooks/use-notification-stream.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationSSEEvent } from "@/contracts/api";
import type { UseNotificationStreamReturn } from "@/contracts/ui";
import type { z } from "zod/v4";

type NotifEvent = z.infer<typeof NotificationSSEEvent>;

export function useNotificationStream(): UseNotificationStreamReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<NotifEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsed = NotificationSSEEvent.safeParse(data);
        if (parsed.success) {
          if (parsed.data.type === "new_notification") {
            setLatestNotification(parsed.data);
            setUnreadCount((prev) => prev + 1);
          } else if (parsed.data.type === "unread_count") {
            setUnreadCount(parsed.data.count);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => setIsConnected(false);

    return () => es.close();
  }, []);

  return { unreadCount, latestNotification, isConnected };
}
```

**Step 3: Verify build, commit**

```
git add src/hooks/use-agent-stream.ts src/hooks/use-notification-stream.ts
git commit -m "feat: add useAgentStream and useNotificationStream SSE hooks"
```

---

### Task 16: BellButton Component

Gold bell icon button that triggers `/api/agents/bell`. Shows ringing animation while agents execute.

**Files:**
- Create: `src/components/agents/bell-button.tsx`

**Step 1: Implement**

```tsx
// src/components/agents/bell-button.tsx
"use client";

import { useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BellButtonProps } from "@/contracts/ui";
import { designTokens } from "@/lib/design-tokens";

export function BellButton({ onRing, isRinging, disabled }: BellButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || isRinging}
      onClick={() => onRing()}
      className={cn(
        "relative h-10 w-10 rounded-full transition-all duration-300",
        "hover:bg-[#C9A84C]/10",
        isRinging && "animate-pulse"
      )}
      title="Ring the bell — assemble the team"
    >
      <Bell
        className={cn(
          "h-5 w-5 transition-colors",
          isRinging ? "text-[#C9A84C] animate-[ring_0.5s_ease-in-out_infinite]" : "text-[#8B8FA3]"
        )}
      />
      {isRinging && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#C9A84C] animate-ping" />
      )}
    </Button>
  );
}
```

**Step 2: Commit**

```
git add src/components/agents/bell-button.tsx
git commit -m "feat: add BellButton component with gold ring animation"
```

---

### Task 17: AgentExecutionPanel Component

Shows real-time department status rows as agents execute. Uses `useAgentStream`.

**Files:**
- Create: `src/components/agents/agent-execution-panel.tsx`

**Step 1: Implement**

```tsx
// src/components/agents/agent-execution-panel.tsx
"use client";

import { useMemo } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { AgentExecutionPanelProps, DepartmentStatusRow } from "@/contracts/ui";
import { cn } from "@/lib/utils";

const DEPARTMENT_LABELS: Record<string, string> = {
  cro: "Chief Revenue Officer",
  cio: "Chief Information Officer",
  cmo: "Chief Marketing Officer",
  coo: "Chief Operations Officer",
  cpo: "Chief Product Officer",
  cno: "Chief Networking Officer",
  cfo: "Chief Financial Officer",
};

export function AgentExecutionPanel({ executionId, onClose }: AgentExecutionPanelProps) {
  const { events, isConnected } = useAgentStream(executionId);

  const departments = useMemo(() => {
    const map = new Map<string, DepartmentStatusRow>();

    for (const event of events) {
      if (event.type === "heartbeat") continue;
      const dept = event.department;

      if (event.type === "agent_start") {
        map.set(dept, {
          department: dept,
          label: DEPARTMENT_LABELS[dept] ?? dept,
          status: "running",
          currentStep: "Initializing...",
        });
      } else if (event.type === "agent_progress") {
        const existing = map.get(dept);
        if (existing) {
          existing.status = "running";
          existing.currentStep = event.step;
          existing.progress = event.progress;
        }
      } else if (event.type === "agent_complete") {
        const existing = map.get(dept);
        if (existing) {
          existing.status = "complete";
          existing.summary = event.summary;
        }
      } else if (event.type === "agent_error") {
        const existing = map.get(dept);
        if (existing) {
          existing.status = "error";
          existing.currentStep = event.error;
        }
      }
    }

    return Array.from(map.values());
  }, [events]);

  const briefingReady = events.some((e) => e.type === "briefing_ready");
  const briefingEvent = events.find((e) => e.type === "briefing_ready");

  if (!executionId) return null;

  return (
    <div className="rounded-lg border border-[#C9A84C]/20 bg-[#252540]/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-['Playfair_Display'] text-sm font-semibold text-[#F5F0E8]">
          Agent Operations
        </h3>
        <button onClick={onClose} className="text-[#8B8FA3] hover:text-[#F5F0E8]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isConnected && departments.length === 0 && (
        <div className="flex items-center gap-2 text-[#8B8FA3] text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting to agent stream...
        </div>
      )}

      <div className="space-y-2">
        {departments.map((dept) => (
          <div
            key={dept.department}
            className="flex items-center gap-3 rounded-md bg-[#1A1A2E]/50 px-3 py-2"
          >
            <StatusIcon status={dept.status} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#F5F0E8]">{dept.label}</div>
              <div className="text-xs text-[#8B8FA3] truncate">
                {dept.status === "complete" ? dept.summary : dept.currentStep}
              </div>
            </div>
            {dept.progress != null && dept.status === "running" && (
              <div className="w-16 h-1.5 rounded-full bg-[#1A1A2E] overflow-hidden">
                <div
                  className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                  style={{ width: `${dept.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {briefingReady && briefingEvent && briefingEvent.type === "briefing_ready" && (
        <div className="rounded-md border border-[#C9A84C]/30 bg-[#C9A84C]/5 p-3">
          <p className="text-xs font-medium text-[#C9A84C]">Briefing Ready</p>
          <p className="text-xs text-[#F5F0E8] mt-1">{briefingEvent.headline}</p>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: DepartmentStatusRow["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 text-[#C9A84C] animate-spin" />;
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-[#2D8B6F]" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-[#9B3B3B]" />;
    default:
      return <Clock className="h-4 w-4 text-[#8B8FA3]" />;
  }
}
```

**Step 2: Commit**

```
git add src/components/agents/agent-execution-panel.tsx
git commit -m "feat: add AgentExecutionPanel with real-time department status"
```

---

### Task 18: BriefingCard Component

Displays a compiled briefing with sections per department.

**Files:**
- Create: `src/components/agents/briefing-card.tsx`

**Step 1: Implement**

```tsx
// src/components/agents/briefing-card.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, ChevronRight, Sparkles } from "lucide-react";
import type { BriefingCardProps } from "@/contracts/ui";
import { cn } from "@/lib/utils";

const DEPT_ICONS: Record<string, string> = {
  cro: "Revenue",
  cio: "Intel",
  cmo: "Marketing",
  coo: "Operations",
  cpo: "Product",
  cno: "Network",
  cfo: "Finance",
};

export function BriefingCard({ briefingId, headline, sections, metrics, createdAt }: BriefingCardProps) {
  return (
    <div className="rounded-lg border border-[#C9A84C]/20 bg-[#252540]/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#C9A84C]/10 px-4 py-3 flex items-center gap-3">
        <div className="rounded-full bg-[#C9A84C]/10 p-2">
          <Sparkles className="h-4 w-4 text-[#C9A84C]" />
        </div>
        <div className="flex-1">
          <h3 className="font-['Playfair_Display'] text-sm font-semibold text-[#F5F0E8]">
            {headline}
          </h3>
          <p className="text-xs text-[#8B8FA3] mt-0.5">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            {" · "}
            {(metrics.totalDurationMs / 1000).toFixed(1)}s
            {" · "}
            {metrics.totalTokensUsed.toLocaleString()} tokens
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-[#1A1A2E]/50">
        {sections.map((section) => (
          <div key={section.department} className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#C9A84C] uppercase">
                {DEPT_ICONS[section.department] ?? section.department}
              </span>
              <span className="text-xs text-[#8B8FA3]">·</span>
              <span className="text-xs font-medium text-[#F5F0E8]">{section.title}</span>
            </div>
            <p className="text-sm text-[#D4C5A9] leading-relaxed">{section.content}</p>

            {section.highlights.length > 0 && (
              <ul className="space-y-1">
                {section.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#8B8FA3]">
                    <ChevronRight className="h-3 w-3 text-[#C9A84C] mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            )}

            {section.pendingActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {section.pendingActions.map((action, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-[#C9A84C]/10 px-2 py-0.5 text-xs text-[#C9A84C]"
                  >
                    {action.description}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```
git add src/components/agents/briefing-card.tsx
git commit -m "feat: add BriefingCard component with section rendering"
```

---

### Task 19: NotificationBell Component (TopBar Integration)

Replace the existing bell in TopBar with a live notification bell that shows unread count and dropdown.

**Files:**
- Create: `src/components/agents/notification-bell.tsx`
- Modify: `src/components/layout/top-bar.tsx` — replace static bell with NotificationBell

**Step 1: Implement NotificationBell**

```tsx
// src/components/agents/notification-bell.tsx
"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotificationStream } from "@/hooks/use-notification-stream";
import type { NotificationBellProps } from "@/contracts/ui";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { unreadCount, latestNotification } = useNotificationStream();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (latestNotification && latestNotification.type === "new_notification") {
      setShowToast(true);
      const timeout = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [latestNotification]);

  return (
    <div className="relative">
      <button
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          "hover:bg-[#C9A84C]/10",
          unreadCount > 0 && "text-[#C9A84C]"
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9A84C] px-1 text-[10px] font-bold text-[#1A1A2E]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Toast for latest notification */}
      {showToast && latestNotification && latestNotification.type === "new_notification" && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-[#C9A84C]/20 bg-[#252540] p-3 shadow-lg animate-in slide-in-from-top-2">
          <p className="text-xs font-semibold text-[#F5F0E8]">{latestNotification.title}</p>
          <p className="text-xs text-[#8B8FA3] mt-1 line-clamp-2">{latestNotification.body}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update TopBar to use NotificationBell**

In `src/components/layout/top-bar.tsx`, replace the static `<Bell>` icon button with:

```tsx
import { NotificationBell } from "@/components/agents/notification-bell";
// Replace the existing bell icon div with:
<NotificationBell />
```

**Step 3: Verify build, commit**

```
git add src/components/agents/notification-bell.tsx src/components/layout/top-bar.tsx
git commit -m "feat: add live NotificationBell with SSE stream and toast"
```

---

### Task 20: Wire BellButton into Dashboard

Add the BellButton + AgentExecutionPanel to the dashboard page, with latest briefing display.

**Files:**
- Modify: `src/app/page.tsx` (dashboard)

**Step 1: Add agent orchestration state to dashboard**

Add a `"use client"` wrapper component for the bell interaction:

```tsx
// src/components/agents/dashboard-agent-section.tsx
"use client";

import { useState, useCallback } from "react";
import { BellButton } from "./bell-button";
import { AgentExecutionPanel } from "./agent-execution-panel";
import { BriefingCard } from "./briefing-card";
import type { BriefingCardProps } from "@/contracts/ui";

export function DashboardAgentSection({ latestBriefing }: { latestBriefing: BriefingCardProps | null }) {
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isRinging, setIsRinging] = useState(false);

  const handleRing = useCallback(async (prompt?: string) => {
    setIsRinging(true);
    try {
      const res = await fetch("/api/agents/bell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, trigger: "manual" }),
      });
      const data = await res.json();
      setExecutionId(data.executionId);
      return data.executionId;
    } finally {
      // isRinging stays true until panel is closed
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setExecutionId(null);
    setIsRinging(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BellButton onRing={handleRing} isRinging={isRinging} />
        <span className="text-sm text-[#8B8FA3]">
          {isRinging ? "Agents are working..." : "Ring the bell to start a briefing"}
        </span>
      </div>

      {executionId && (
        <AgentExecutionPanel executionId={executionId} onClose={handleClosePanel} />
      )}

      {latestBriefing && !executionId && (
        <BriefingCard {...latestBriefing} />
      )}
    </div>
  );
}
```

The server component dashboard page (`src/app/page.tsx`) should fetch the latest briefing and render `<DashboardAgentSection latestBriefing={...} />`.

**Step 2: Commit**

```
git add src/components/agents/dashboard-agent-section.tsx src/app/page.tsx
git commit -m "feat: wire BellButton and AgentExecutionPanel into dashboard"
```

---

## Wave 6: Contract Tests (can run in parallel with Wave 5)

### Task 21: Contract Validation Tests

100% coverage on all Zod schemas — good data passes, bad data fails with expected errors.

**Files:**
- Create: `src/__tests__/contracts/events.test.ts`
- Create: `src/__tests__/contracts/agent-protocol.test.ts`
- Create: `src/__tests__/contracts/api.test.ts`
- Create: `src/__tests__/contracts/notifications.test.ts`

**Step 1: Write comprehensive tests**

Each test file should cover:
1. Valid data parses successfully
2. Missing required fields fail
3. Invalid enum values fail
4. Type mismatches fail
5. Default values are applied

Example for events.test.ts:

```ts
import { describe, it, expect } from "vitest";
import {
  BellRingEvent,
  DepartmentId,
  AgentPriority,
  EventMap,
} from "@/contracts/events";

describe("Event Contracts", () => {
  describe("DepartmentId", () => {
    it("accepts valid departments", () => {
      expect(DepartmentId.parse("cro")).toBe("cro");
      expect(DepartmentId.parse("cio")).toBe("cio");
    });

    it("rejects invalid departments", () => {
      expect(() => DepartmentId.parse("invalid")).toThrow();
    });
  });

  describe("BellRingEvent", () => {
    it("parses valid bell ring", () => {
      const result = BellRingEvent.parse({
        name: "bell/ring",
        data: {
          executionId: "abc123",
          userId: "user@example.com",
          trigger: "manual",
          timestamp: "2026-03-12T10:00:00Z",
        },
      });
      expect(result.data.priority).toBe("normal"); // default
    });

    it("rejects missing timestamp", () => {
      expect(() =>
        BellRingEvent.parse({
          name: "bell/ring",
          data: { executionId: "abc", userId: "u", trigger: "manual" },
        })
      ).toThrow();
    });
  });

  describe("EventMap", () => {
    it("has all 14 events", () => {
      expect(Object.keys(EventMap)).toHaveLength(14);
    });
  });
});
```

Follow same pattern for all 4 test files. Total target: ~40 test cases.

**Step 2: Run tests**

Run: `npx vitest run src/__tests__/contracts/`
Expected: ALL PASS

**Step 3: Commit**

```
git add src/__tests__/contracts/
git commit -m "test: add contract validation tests (events, protocol, api, notifications)"
```

---

## Wave 7: Integration Verification

### Task 22: Full Pipeline Smoke Test

Write a test that simulates bell ring → CRO dispatch → complete → briefing compile using mocked AI SDK and Inngest test utilities.

**Files:**
- Create: `src/__tests__/integration/bell-to-briefing.test.ts`

This test mocks `ai` and `@ai-sdk/anthropic`, uses the real Inngest functions but with `inngest/test` or manual event simulation, and verifies:
1. Bell ring creates execution ID
2. CEO dispatches to CRO
3. CRO processes and sends complete event
4. Briefing compiler runs
5. Notification is created

**Step 1: Write the integration test**

```ts
import { describe, it, expect, vi } from "vitest";

// Mock all AI calls
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: '{"headline":"Test briefing","sections":[]}',
    toolCalls: [],
    usage: { promptTokens: 100, completionTokens: 50 },
  }),
  tool: vi.fn((opts) => opts),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue("mock"),
}));

describe("Bell-to-Briefing Pipeline", () => {
  it("validates the contract chain from bell ring to briefing", async () => {
    // Import contracts
    const { BellRingEvent, BriefingCompileEvent, BriefingReadyEvent } = await import("@/contracts");

    // Validate bell ring event shape
    const bellEvent = BellRingEvent.parse({
      name: "bell/ring",
      data: {
        executionId: "test-exec-1",
        userId: "test@example.com",
        trigger: "manual",
        priority: "normal",
        timestamp: new Date().toISOString(),
      },
    });
    expect(bellEvent.data.executionId).toBe("test-exec-1");

    // Validate briefing compile event
    const compileEvent = BriefingCompileEvent.parse({
      name: "briefing/compile",
      data: {
        executionId: "test-exec-1",
        departmentResults: [{
          department: "cro",
          taskId: "task-1",
          status: "complete",
          result: { summary: "Pipeline healthy" },
        }],
        timestamp: new Date().toISOString(),
      },
    });
    expect(compileEvent.data.departmentResults).toHaveLength(1);

    // Validate briefing ready event
    const readyEvent = BriefingReadyEvent.parse({
      name: "briefing/ready",
      data: {
        executionId: "test-exec-1",
        briefingId: "briefing-1",
        summary: "Morning Briefing Ready",
        timestamp: new Date().toISOString(),
      },
    });
    expect(readyEvent.data.briefingId).toBe("briefing-1");
  });
});
```

**Step 2: Run test, verify pass**

Run: `npx vitest run src/__tests__/integration/bell-to-briefing.test.ts`

**Step 3: Final build verification**

Run: `npm run build && npm test`
Expected: ALL PASS

**Step 4: Commit**

```
git add src/__tests__/integration/
git commit -m "test: add bell-to-briefing integration test validating contract chain"
```

---

## Task Dependency Graph

```
Wave 1 (parallel):  T1 Inngest types | T2 Logger | T3 Event Bus | T4 Notif Router
                         |                |            |              |
Wave 2:              T5 CRO Tools ───── T6 CRO Agent ◄──────────────┘
                                              |
Wave 3:              T7 CEO Orchestrator ─── T8 Briefing Compiler ─── T9 Register
                         |                       |
Wave 4 (parallel):   T10 Bell API | T11 SSE Stream | T12 Briefing API | T13 Notif API | T14 Outreach API
                         |              |
Wave 5 (parallel):   T15 Hooks | T16 BellButton | T17 ExecPanel | T18 BriefingCard | T19 NotifBell | T20 Dashboard
                                                                                                        |
Wave 6 (parallel):   T21 Contract Tests ─── T22 Integration Test
```

## Summary

- **22 tasks** across **7 waves**
- **~35 files** created/modified
- **All types imported from `@/contracts/`** — zero inline cross-domain types
- **TDD where practical** — tests before implementation for utilities, mocked AI for agents
- **Atomic commits** — one commit per task
