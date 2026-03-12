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
