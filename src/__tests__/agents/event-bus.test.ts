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

  it("should not deliver after unsubscribe", async () => {
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
