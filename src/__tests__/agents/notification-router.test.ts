import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/lib/agents/notification-bus", () => ({
  notificationBus: {
    publish: vi.fn(),
  },
}));

describe("notificationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create notification and publish to bus", async () => {
    const { routeNotification } = await import(
      "@/lib/agents/notification-router"
    );
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
      expect.objectContaining({
        type: "new_notification",
        title: "Morning Briefing Ready",
      })
    );
  });

  it("should insert into db", async () => {
    const { routeNotification } = await import(
      "@/lib/agents/notification-router"
    );
    const { db } = await import("@/db");

    await routeNotification({
      type: "briefing_ready",
      priority: "high",
      title: "Morning Briefing Ready",
      body: "Your daily briefing has been compiled.",
      channels: ["in_app"],
      timestamp: new Date().toISOString(),
    });

    expect(db.insert).toHaveBeenCalled();
  });

  it("should not publish to bus when in_app channel is not included", async () => {
    const { routeNotification } = await import(
      "@/lib/agents/notification-router"
    );
    const { notificationBus } = await import("@/lib/agents/notification-bus");

    await routeNotification({
      type: "briefing_ready",
      priority: "low",
      title: "Email Only Notification",
      body: "This goes only to email.",
      channels: ["email"],
      timestamp: new Date().toISOString(),
    });

    expect(notificationBus.publish).not.toHaveBeenCalled();
  });

  it("should return a string id", async () => {
    const { routeNotification } = await import(
      "@/lib/agents/notification-router"
    );

    const id = await routeNotification({
      type: "test",
      priority: "medium",
      title: "Test",
      body: "Test body",
      channels: ["in_app"],
      timestamp: new Date().toISOString(),
    });

    expect(typeof id).toBe("string");
    expect(id.length).toBe(16);
  });
});
