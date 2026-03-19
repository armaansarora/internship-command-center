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
  retryConfig: z
    .object({
      maxAttempts: z.number().default(3),
      backoffMs: z.number().default(1000),
    })
    .default({ maxAttempts: 3, backoffMs: 1000 }),
});

export const AgentTask = z.object({
  executionId: ExecutionId,
  taskId: z.string(),
  department: DepartmentId,
  instructions: z.string(),
  context: z.object({
    userPrompt: z.string().optional(),
    relatedEntities: z
      .array(z.object({ type: z.string(), id: z.string() }))
      .default([]),
    previousResults: z.record(z.string(), z.unknown()).optional(),
  }),
  priority: AgentPriority,
  constraints: z
    .object({
      maxTokens: z.number().optional(),
      deadline: z.string().datetime().optional(),
      noSideEffects: z.boolean().default(false),
    })
    .default({ noSideEffects: false }),
});

export const AgentResult = z.object({
  executionId: ExecutionId,
  taskId: z.string(),
  department: DepartmentId,
  status: z.enum(["success", "partial", "error"]),
  summary: z.string(),
  data: z.record(z.string(), z.unknown()),
  actions: z
    .array(
      z.object({
        type: z.enum([
          "outreach_draft",
          "status_update",
          "schedule",
          "research",
          "notify",
        ]),
        payload: z.record(z.string(), z.unknown()),
        requiresApproval: z.boolean(),
      })
    )
    .default([]),
  tokenUsage: z.object({ input: z.number(), output: z.number() }),
  durationMs: z.number(),
});

export const CeoDecision = z.object({
  departments: z.array(
    z.object({
      department: DepartmentId,
      instructions: z.string(),
      priority: AgentPriority,
      dependsOn: z.array(DepartmentId).default([]),
    })
  ),
  reasoning: z.string(),
});

export const BriefingSummary = z.object({
  executionId: ExecutionId,
  briefingId: z.string(),
  headline: z.string(),
  sections: z.array(
    z.object({
      department: DepartmentId,
      title: z.string(),
      content: z.string(),
      highlights: z.array(z.string()).default([]),
      pendingActions: z
        .array(
          z.object({
            description: z.string(),
            actionType: z.string(),
            entityId: z.string().optional(),
          })
        )
        .default([]),
    })
  ),
  metrics: z.object({
    totalTokensUsed: z.number(),
    totalDurationMs: z.number(),
    departmentsInvolved: z.array(DepartmentId),
  }),
  createdAt: z.string().datetime(),
});
