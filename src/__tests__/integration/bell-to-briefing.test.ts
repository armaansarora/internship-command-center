import { describe, it, expect } from "vitest";
import {
  BellRingEvent,
  CeoDispatchEvent,
  AgentStartEvent,
  AgentProgressEvent,
  AgentCompleteEvent,
  BriefingCompileEvent,
  BriefingReadyEvent,
  NotificationCreateEvent,
  CeoDecision,
  BriefingSummary,
  AgentResult,
} from "@/contracts";

describe("Bell-to-Briefing Pipeline", () => {
  const now = new Date().toISOString();
  const executionId = "test-exec-001";

  it("Step 1: bell ring event is valid", () => {
    const event = BellRingEvent.parse({
      name: "bell/ring",
      data: {
        executionId,
        userId: "test@example.com",
        trigger: "manual",
        timestamp: now,
      },
    });
    expect(event.data.executionId).toBe(executionId);
    expect(event.data.priority).toBe("normal"); // default applied
  });

  it("Step 2: CEO produces a valid dispatch decision", () => {
    const decision = CeoDecision.parse({
      departments: [
        {
          department: "cro",
          instructions: "Analyze the current pipeline status",
          priority: "normal",
        },
      ],
      reasoning: "CRO should analyze revenue pipeline",
    });
    expect(decision.departments).toHaveLength(1);
    expect(decision.departments[0].dependsOn).toEqual([]); // default
  });

  it("Step 3: CEO dispatches to CRO", () => {
    const dispatch = CeoDispatchEvent.parse({
      name: "ceo/dispatch",
      data: {
        executionId,
        department: "cro",
        taskId: "task-cro-001",
        instructions: "Analyze the current pipeline status",
        priority: "normal",
      },
    });
    expect(dispatch.data.department).toBe("cro");
  });

  it("Step 4: agent start event fires", () => {
    const start = AgentStartEvent.parse({
      name: "agent/start",
      data: {
        executionId,
        department: "cro",
        taskId: "task-cro-001",
        timestamp: now,
      },
    });
    expect(start.data.department).toBe("cro");
  });

  it("Step 5: agent progress events stream", () => {
    const progress = AgentProgressEvent.parse({
      name: "agent/progress",
      data: {
        executionId,
        department: "cro",
        taskId: "task-cro-001",
        step: "Querying applications database",
        progress: 50,
        timestamp: now,
      },
    });
    expect(progress.data.progress).toBe(50);
  });

  it("Step 6: CRO produces valid result", () => {
    const result = AgentResult.parse({
      executionId,
      taskId: "task-cro-001",
      department: "cro",
      status: "success",
      summary:
        "Pipeline analysis complete. 15 active applications, 3 need follow-up.",
      data: { activeCount: 15, followUpNeeded: 3 },
      tokenUsage: { input: 1500, output: 800 },
      durationMs: 4500,
    });
    expect(result.status).toBe("success");
    expect(result.actions).toEqual([]); // default
  });

  it("Step 7: agent complete event fires", () => {
    const complete = AgentCompleteEvent.parse({
      name: "agent/complete",
      data: {
        executionId,
        department: "cro",
        taskId: "task-cro-001",
        result: { summary: "Pipeline healthy", activeCount: 15 },
        tokenUsage: { input: 1500, output: 800 },
        durationMs: 4500,
        timestamp: now,
      },
    });
    expect(complete.data.durationMs).toBe(4500);
  });

  it("Step 8: briefing compile event aggregates results", () => {
    const compile = BriefingCompileEvent.parse({
      name: "briefing/compile",
      data: {
        executionId,
        departmentResults: [
          {
            department: "cro",
            taskId: "task-cro-001",
            status: "complete",
            result: { summary: "Pipeline healthy" },
          },
        ],
        timestamp: now,
      },
    });
    expect(compile.data.departmentResults).toHaveLength(1);
  });

  it("Step 9: briefing summary is valid", () => {
    const briefing = BriefingSummary.parse({
      executionId,
      briefingId: "briefing-001",
      headline: "Morning Briefing: Pipeline Strong",
      sections: [
        {
          department: "cro",
          title: "Revenue Pipeline",
          content: "15 active applications with 3 requiring follow-up.",
          highlights: ["3 applications need follow-up this week"],
          pendingActions: [
            {
              description: "Send follow-up to Company X",
              actionType: "outreach_draft",
              entityId: "app-123",
            },
          ],
        },
      ],
      metrics: {
        totalTokensUsed: 2300,
        totalDurationMs: 5200,
        departmentsInvolved: ["cro"],
      },
      createdAt: now,
    });
    expect(briefing.headline).toContain("Pipeline");
    expect(briefing.sections).toHaveLength(1);
  });

  it("Step 10: briefing ready event fires", () => {
    const ready = BriefingReadyEvent.parse({
      name: "briefing/ready",
      data: {
        executionId,
        briefingId: "briefing-001",
        summary: "Morning Briefing: Pipeline Strong",
        timestamp: now,
      },
    });
    expect(ready.data.briefingId).toBe("briefing-001");
  });

  it("Step 11: notification is created for briefing", () => {
    const notification = NotificationCreateEvent.parse({
      name: "notification/create",
      data: {
        type: "briefing_ready",
        priority: "medium",
        title: "Briefing Ready",
        body: "Your morning briefing is ready to review.",
        sourceAgent: "cro",
        channels: ["in_app", "push"],
        timestamp: now,
      },
    });
    expect(notification.data.channels).toContain("in_app");
  });

  it("validates full contract chain end-to-end", () => {
    // This test verifies every event in sequence can be created,
    // proving the contract chain is complete and type-safe
    const steps = [
      () =>
        BellRingEvent.parse({
          name: "bell/ring",
          data: {
            executionId,
            userId: "u",
            trigger: "manual",
            timestamp: now,
          },
        }),
      () =>
        CeoDispatchEvent.parse({
          name: "ceo/dispatch",
          data: {
            executionId,
            department: "cro",
            taskId: "t",
            instructions: "go",
            priority: "normal",
          },
        }),
      () =>
        AgentStartEvent.parse({
          name: "agent/start",
          data: { executionId, department: "cro", taskId: "t", timestamp: now },
        }),
      () =>
        AgentProgressEvent.parse({
          name: "agent/progress",
          data: {
            executionId,
            department: "cro",
            taskId: "t",
            step: "working",
            timestamp: now,
          },
        }),
      () =>
        AgentCompleteEvent.parse({
          name: "agent/complete",
          data: {
            executionId,
            department: "cro",
            taskId: "t",
            result: {},
            tokenUsage: { input: 1, output: 1 },
            durationMs: 1,
            timestamp: now,
          },
        }),
      () =>
        BriefingCompileEvent.parse({
          name: "briefing/compile",
          data: {
            executionId,
            departmentResults: [
              { department: "cro", taskId: "t", status: "complete" },
            ],
            timestamp: now,
          },
        }),
      () =>
        BriefingReadyEvent.parse({
          name: "briefing/ready",
          data: {
            executionId,
            briefingId: "b",
            summary: "done",
            timestamp: now,
          },
        }),
    ];

    for (const step of steps) {
      expect(() => step()).not.toThrow();
    }
  });
});
