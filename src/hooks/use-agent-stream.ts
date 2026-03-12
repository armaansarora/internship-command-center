"use client";

import { useState, useEffect, useRef } from "react";
import { SSEEvent } from "@/contracts/api";
import type { UseAgentStreamReturn } from "@/contracts/ui";
import type { z } from "zod/v4";

type SSEEventType = z.infer<typeof SSEEvent>;

export function useAgentStream(executionId: string | null): UseAgentStreamReturn {
  const [events, setEvents] = useState<SSEEventType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!executionId) {
      setEvents([]);
      setIsConnected(false);
      return;
    }

    const es = new EventSource(`/api/agents/stream?executionId=${executionId}`);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsed = SSEEvent.safeParse(data);
        if (parsed.success) {
          if (parsed.data.type !== "heartbeat") {
            setEvents((prev) => [...prev, parsed.data]);
          }
        }
      } catch {
        // Ignore parse errors on heartbeats
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setError(new Error("SSE connection lost"));
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [executionId]);

  return { events, isConnected, error };
}
