import { describe, it, expect } from "vitest";
import {
  NotificationType,
  PushPayload,
  PushSubscription,
  CHANNEL_ROUTING,
} from "@/contracts/notifications";

describe("NotificationType enum", () => {
  it("accepts all 9 valid notification types", () => {
    const types = [
      "agent_started",
      "agent_completed",
      "agent_error",
      "briefing_ready",
      "outreach_pending",
      "outreach_sent",
      "status_change",
      "interview_scheduled",
      "deadline_approaching",
    ];
    for (const t of types) {
      expect(NotificationType.parse(t)).toBe(t);
    }
  });

  it("rejects invalid notification type", () => {
    expect(() => NotificationType.parse("email_sent")).toThrow();
  });
});

describe("PushPayload", () => {
  it("applies icon and badge defaults", () => {
    const result = PushPayload.parse({
      title: "Alert",
      body: "Something happened",
      tag: "test-tag",
      data: {
        url: "/dashboard",
        notificationId: "n1",
        type: "briefing_ready",
      },
    });
    expect(result.icon).toBe("/icons/icc-192.png");
    expect(result.badge).toBe("/icons/icc-badge.png");
  });

  it("allows custom icon and badge", () => {
    const result = PushPayload.parse({
      title: "Alert",
      body: "Body",
      icon: "/custom-icon.png",
      badge: "/custom-badge.png",
      tag: "tag",
      data: { url: "/x", notificationId: "n2", type: "agent_error" },
    });
    expect(result.icon).toBe("/custom-icon.png");
    expect(result.badge).toBe("/custom-badge.png");
  });

  it("rejects missing required tag", () => {
    expect(() =>
      PushPayload.parse({
        title: "T",
        body: "B",
        data: { url: "/", notificationId: "n", type: "agent_started" },
      })
    ).toThrow();
  });

  it("rejects invalid notification type in data", () => {
    expect(() =>
      PushPayload.parse({
        title: "T",
        body: "B",
        tag: "t",
        data: { url: "/", notificationId: "n", type: "invalid_type" },
      })
    ).toThrow();
  });

  it("limits actions array to max 2", () => {
    expect(() =>
      PushPayload.parse({
        title: "T",
        body: "B",
        tag: "t",
        data: { url: "/", notificationId: "n", type: "agent_started" },
        actions: [
          { action: "a1", title: "A1" },
          { action: "a2", title: "A2" },
          { action: "a3", title: "A3" },
        ],
      })
    ).toThrow();
  });
});

describe("PushSubscription", () => {
  it("parses valid subscription with URL endpoint", () => {
    const result = PushSubscription.parse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.endpoint).toContain("https://");
  });

  it("rejects non-URL endpoint", () => {
    expect(() =>
      PushSubscription.parse({
        endpoint: "not-a-url",
        keys: { p256dh: "k", auth: "a" },
      })
    ).toThrow();
  });

  it("rejects missing keys", () => {
    expect(() =>
      PushSubscription.parse({
        endpoint: "https://example.com/push",
      })
    ).toThrow();
  });
});

describe("CHANNEL_ROUTING", () => {
  it("has exactly 9 keys", () => {
    expect(Object.keys(CHANNEL_ROUTING)).toHaveLength(9);
  });

  it("briefing_ready routes to in_app and push", () => {
    expect(CHANNEL_ROUTING.briefing_ready).toEqual(["in_app", "push"]);
  });

  it("status_change routes to in_app only", () => {
    expect(CHANNEL_ROUTING.status_change).toEqual(["in_app"]);
  });
});
