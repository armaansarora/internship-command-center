import type { z } from "zod/v4";
import type { NotificationSSEEvent } from "@/contracts/api";

type NotifEvent = z.infer<typeof NotificationSSEEvent>;
type Listener = (event: NotifEvent) => void;

class NotificationBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: NotifEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const notificationBus = new NotificationBus();
