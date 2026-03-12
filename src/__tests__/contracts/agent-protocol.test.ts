import { describe, it, expect } from "vitest";
import {
  AgentDefinition,
  AgentTask,
  AgentResult,
  CeoDecision,
  BriefingSummary,
} from "@/contracts/agent-protocol";

const eid = "exec-001";
const ts = "2026-03-12T10:00:00Z";

describe("AgentDefinition", () => {
  it("applies all defaults", () => {
    const result = AgentDefinition.parse({
      department: "cro",
      name: "Revenue Agent",
      codename: "rev-1",
      description: "Handles revenue",
    });
    expect(result.model).toBe("claude-sonnet-4-20250514");
    expect(result.maxTokens).toBe(4096);
    expect(result.tokenBudget).toBe(100_000);
    expect(result.temperature).toBe(0.3);
    expect(result.retryConfig).toEqual({ maxAttempts: 3, backoffMs: 1000 });
  });

  it("rejects invalid department", () => {
    expect(() =>
      AgentDefinition.parse({
        department: "xyz",
        name: "X",
        codename: "x",
        description: "d",
      })
    ).toThrow();
  });

  it("rejects temperature out of range", () => {
    expect(() =>
      AgentDefinition.parse({
        department: "cro",
        name: "X",
        codename: "x",
        description: "d",
        temperature: 1.5,
      })
    ).toThrow();
  });

  it("rejects missing required field name", () => {
    expect(() =>
      AgentDefinition.parse({
        department: "cro",
        codename: "x",
        description: "d",
      })
    ).toThrow();
  });
});

describe("AgentTask", () => {
  it("applies default relatedEntities and constraints", () => {
    const result = AgentTask.parse({
      executionId: eid,
      taskId: "t1",
      department: "cio",
      instructions: "research",
      context: {},
      priority: "normal",
    });
    expect(result.context.relatedEntities).toEqual([]);
    expect(result.constraints.noSideEffects).toBe(false);
  });

  it("rejects missing instructions", () => {
    expect(() =>
      AgentTask.parse({
        executionId: eid,
        taskId: "t1",
        department: "cio",
        context: {},
        priority: "normal",
      })
    ).toThrow();
  });
});

describe("AgentResult", () => {
  it("applies default empty actions array", () => {
    const result = AgentResult.parse({
      executionId: eid,
      taskId: "t1",
      department: "cro",
      status: "success",
      summary: "done",
      data: {},
      tokenUsage: { input: 100, output: 200 },
      durationMs: 500,
    });
    expect(result.actions).toEqual([]);
  });

  it("rejects invalid status enum", () => {
    expect(() =>
      AgentResult.parse({
        executionId: eid,
        taskId: "t1",
        department: "cro",
        status: "failed",
        summary: "x",
        data: {},
        tokenUsage: { input: 0, output: 0 },
        durationMs: 0,
      })
    ).toThrow();
  });

  it("accepts action with valid type", () => {
    const result = AgentResult.parse({
      executionId: eid,
      taskId: "t1",
      department: "cro",
      status: "success",
      summary: "done",
      data: {},
      actions: [
        { type: "outreach_draft", payload: { to: "a@b.com" }, requiresApproval: true },
      ],
      tokenUsage: { input: 10, output: 20 },
      durationMs: 100,
    });
    expect(result.actions).toHaveLength(1);
  });
});

describe("CeoDecision", () => {
  it("applies default dependsOn for departments", () => {
    const result = CeoDecision.parse({
      departments: [
        { department: "cro", instructions: "go", priority: "high" },
      ],
      reasoning: "because",
    });
    expect(result.departments[0].dependsOn).toEqual([]);
  });

  it("preserves explicit dependsOn", () => {
    const result = CeoDecision.parse({
      departments: [
        { department: "cmo", instructions: "go", priority: "normal", dependsOn: ["cro"] },
      ],
      reasoning: "chained",
    });
    expect(result.departments[0].dependsOn).toEqual(["cro"]);
  });
});

describe("BriefingSummary", () => {
  it("applies default highlights and pendingActions in sections", () => {
    const result = BriefingSummary.parse({
      executionId: eid,
      briefingId: "b1",
      headline: "Morning Brief",
      sections: [
        { department: "cro", title: "Revenue", content: "Good" },
      ],
      metrics: {
        totalTokensUsed: 5000,
        totalDurationMs: 3000,
        departmentsInvolved: ["cro"],
      },
      createdAt: ts,
    });
    expect(result.sections[0].highlights).toEqual([]);
    expect(result.sections[0].pendingActions).toEqual([]);
  });

  it("rejects missing headline", () => {
    expect(() =>
      BriefingSummary.parse({
        executionId: eid,
        briefingId: "b1",
        sections: [],
        metrics: {
          totalTokensUsed: 0,
          totalDurationMs: 0,
          departmentsInvolved: [],
        },
        createdAt: ts,
      })
    ).toThrow();
  });
});
