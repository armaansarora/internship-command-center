import { describe, it, expect } from "vitest";
import {
  BellRingRequest,
  BellRingResponse,
  SSEEvent,
  NotificationListParams,
  NotificationListResponse,
  MarkReadResponse,
  OutreachApproveResponse,
  OutreachRejectRequest,
  OutreachRejectResponse,
  ROUTE_MANIFEST,
} from "@/contracts/api";

const ts = "2026-03-12T10:00:00Z";

describe("BellRingRequest", () => {
  it("applies trigger and priority defaults", () => {
    const result = BellRingRequest.parse({});
    expect(result.trigger).toBe("manual");
    expect(result.priority).toBe("normal");
  });

  it("accepts explicit values", () => {
    const result = BellRingRequest.parse({
      prompt: "check status",
      trigger: "webhook",
      priority: "urgent",
    });
    expect(result.trigger).toBe("webhook");
    expect(result.priority).toBe("urgent");
  });

  it("rejects invalid trigger value", () => {
    expect(() => BellRingRequest.parse({ trigger: "auto" })).toThrow();
  });
});

describe("BellRingResponse", () => {
  it("parses valid response", () => {
    const result = BellRingResponse.parse({
      executionId: "abc",
      status: "dispatched",
      message: "ok",
    });
    expect(result.status).toBe("dispatched");
  });

  it("rejects wrong status literal", () => {
    expect(() =>
      BellRingResponse.parse({
        executionId: "abc",
        status: "pending",
        message: "ok",
      })
    ).toThrow();
  });
});

describe("SSEEvent discriminated union", () => {
  it("parses agent_start variant", () => {
    const result = SSEEvent.parse({
      type: "agent_start",
      department: "cro",
      taskId: "t1",
      timestamp: ts,
    });
    expect(result.type).toBe("agent_start");
  });

  it("parses agent_progress variant", () => {
    const result = SSEEvent.parse({
      type: "agent_progress",
      department: "cio",
      step: "researching",
      timestamp: ts,
    });
    expect(result.type).toBe("agent_progress");
  });

  it("parses heartbeat variant", () => {
    const result = SSEEvent.parse({ type: "heartbeat", timestamp: ts });
    expect(result.type).toBe("heartbeat");
  });

  it("parses briefing_ready variant", () => {
    const result = SSEEvent.parse({
      type: "briefing_ready",
      briefingId: "b1",
      headline: "Morning Brief",
      timestamp: ts,
    });
    expect(result.type).toBe("briefing_ready");
  });

  it("rejects unknown type discriminator", () => {
    expect(() =>
      SSEEvent.parse({ type: "unknown_event", timestamp: ts })
    ).toThrow();
  });

  it("rejects agent_start missing required taskId", () => {
    expect(() =>
      SSEEvent.parse({ type: "agent_start", department: "cro", timestamp: ts })
    ).toThrow();
  });
});

describe("NotificationListParams", () => {
  it("applies all defaults", () => {
    const result = NotificationListParams.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.unreadOnly).toBe(false);
  });

  it("accepts explicit overrides", () => {
    const result = NotificationListParams.parse({
      limit: 50,
      offset: 10,
      unreadOnly: true,
    });
    expect(result.limit).toBe(50);
    expect(result.unreadOnly).toBe(true);
  });

  it("rejects non-number limit", () => {
    expect(() => NotificationListParams.parse({ limit: "ten" })).toThrow();
  });
});

describe("NotificationListResponse", () => {
  it("parses valid response with notifications array", () => {
    const result = NotificationListResponse.parse({
      notifications: [
        {
          id: "n1",
          type: "briefing_ready",
          priority: "high",
          title: "Briefing",
          body: "Ready",
          sourceAgent: null,
          isRead: false,
          actions: null,
          createdAt: ts,
        },
      ],
      total: 1,
      unreadCount: 1,
    });
    expect(result.notifications).toHaveLength(1);
  });
});

describe("OutreachApproveResponse / RejectResponse", () => {
  it("parses approve response", () => {
    const result = OutreachApproveResponse.parse({
      success: true,
      outreachId: "o1",
      status: "approved",
    });
    expect(result.status).toBe("approved");
  });

  it("parses reject response", () => {
    const result = OutreachRejectResponse.parse({
      success: true,
      outreachId: "o1",
      status: "rejected",
    });
    expect(result.status).toBe("rejected");
  });

  it("reject request accepts optional reason", () => {
    expect(OutreachRejectRequest.parse({}).reason).toBeUndefined();
    expect(OutreachRejectRequest.parse({ reason: "not good" }).reason).toBe("not good");
  });
});

describe("ROUTE_MANIFEST", () => {
  it("has 9 route entries", () => {
    expect(Object.keys(ROUTE_MANIFEST)).toHaveLength(9);
  });
});
