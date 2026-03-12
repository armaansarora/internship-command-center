import { describe, it, expect } from "vitest";
import {
  DepartmentId,
  AgentPriority,
  ExecutionId,
  BellRingEvent,
  CeoDispatchEvent,
  AgentCompleteEvent,
  AgentErrorEvent,
  BriefingCompileEvent,
  BriefingReadyEvent,
  OutreachDraftEvent,
  OutreachApprovedEvent,
  OutreachSentEvent,
  AgentStartEvent,
  AgentProgressEvent,
  NotificationCreateEvent,
  ScheduledBriefingEvent,
  ScheduledSnapshotEvent,
  EventMap,
} from "@/contracts/events";

const ts = "2026-03-12T10:00:00Z";
const eid = "abc123";

describe("DepartmentId enum", () => {
  it("accepts all 7 valid department IDs", () => {
    for (const id of ["cro", "cio", "cmo", "coo", "cpo", "cno", "cfo"]) {
      expect(DepartmentId.parse(id)).toBe(id);
    }
  });

  it("rejects invalid department ID", () => {
    expect(() => DepartmentId.parse("cto")).toThrow();
  });
});

describe("AgentPriority enum", () => {
  it("accepts valid priorities", () => {
    for (const p of ["urgent", "high", "normal", "low"]) {
      expect(AgentPriority.parse(p)).toBe(p);
    }
  });

  it("rejects invalid priority", () => {
    expect(() => AgentPriority.parse("critical")).toThrow();
  });
});

describe("ExecutionId", () => {
  it("accepts a string", () => {
    expect(ExecutionId.parse("exec-001")).toBe("exec-001");
  });

  it("rejects non-string", () => {
    expect(() => ExecutionId.parse(42)).toThrow();
  });
});

describe("BellRingEvent", () => {
  it("parses valid event with defaults", () => {
    const result = BellRingEvent.parse({
      name: "bell/ring",
      data: { executionId: eid, userId: "u1", trigger: "manual", timestamp: ts },
    });
    expect(result.data.priority).toBe("normal");
  });

  it("rejects wrong literal name", () => {
    expect(() =>
      BellRingEvent.parse({
        name: "bell/wrong",
        data: { executionId: eid, userId: "u1", trigger: "manual", timestamp: ts },
      })
    ).toThrow();
  });

  it("rejects missing required field userId", () => {
    expect(() =>
      BellRingEvent.parse({
        name: "bell/ring",
        data: { executionId: eid, trigger: "manual", timestamp: ts },
      })
    ).toThrow();
  });
});

describe("CeoDispatchEvent", () => {
  it("parses valid event", () => {
    const result = CeoDispatchEvent.parse({
      name: "ceo/dispatch",
      data: {
        executionId: eid,
        department: "cro",
        taskId: "t1",
        instructions: "do stuff",
        priority: "high",
      },
    });
    expect(result.data.department).toBe("cro");
  });
});

describe("AgentCompleteEvent", () => {
  it("parses valid event", () => {
    const result = AgentCompleteEvent.parse({
      name: "agent/complete",
      data: {
        executionId: eid,
        department: "cio",
        taskId: "t1",
        result: { found: true },
        tokenUsage: { input: 100, output: 50 },
        durationMs: 1200,
        timestamp: ts,
      },
    });
    expect(result.data.tokenUsage.input).toBe(100);
  });
});

describe("AgentErrorEvent", () => {
  it("rejects non-boolean retryable", () => {
    expect(() =>
      AgentErrorEvent.parse({
        name: "agent/error",
        data: {
          executionId: eid,
          department: "cro",
          taskId: "t1",
          error: "boom",
          retryable: "yes",
          attempt: 1,
          timestamp: ts,
        },
      })
    ).toThrow();
  });
});

describe("OutreachDraftEvent", () => {
  it("accepts valid outreach types", () => {
    const result = OutreachDraftEvent.parse({
      name: "outreach/draft",
      data: {
        executionId: eid,
        outreachId: "o1",
        department: "cro",
        type: "cold_email",
        subject: "Hi",
        body: "Hello",
        timestamp: ts,
      },
    });
    expect(result.data.type).toBe("cold_email");
  });

  it("rejects invalid outreach type", () => {
    expect(() =>
      OutreachDraftEvent.parse({
        name: "outreach/draft",
        data: {
          executionId: eid,
          outreachId: "o1",
          department: "cro",
          type: "spam",
          subject: "Hi",
          body: "Hello",
          timestamp: ts,
        },
      })
    ).toThrow();
  });
});

describe("NotificationCreateEvent", () => {
  it("parses valid notification event", () => {
    const result = NotificationCreateEvent.parse({
      name: "notification/create",
      data: {
        type: "agent_completed",
        priority: "medium",
        title: "Done",
        body: "Agent finished",
        channels: ["in_app"],
        timestamp: ts,
      },
    });
    expect(result.name).toBe("notification/create");
  });

  it("rejects invalid channel value", () => {
    expect(() =>
      NotificationCreateEvent.parse({
        name: "notification/create",
        data: {
          type: "x",
          priority: "medium",
          title: "T",
          body: "B",
          channels: ["sms"],
          timestamp: ts,
        },
      })
    ).toThrow();
  });
});

describe("EventMap", () => {
  it("has exactly 14 keys", () => {
    expect(Object.keys(EventMap)).toHaveLength(14);
  });

  it("contains all expected event names", () => {
    const keys = Object.keys(EventMap);
    expect(keys).toContain("bell/ring");
    expect(keys).toContain("ceo/dispatch");
    expect(keys).toContain("outreach/sent");
    expect(keys).toContain("cron/daily-snapshot");
  });
});
