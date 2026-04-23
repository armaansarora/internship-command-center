"use client";

import { useEffect, useRef, useState } from "react";
import type { DispatchProgressResponse } from "@/app/api/ceo/dispatches/route";

/**
 * Map keyed by agent name (lowercased) to the current lifecycle state for
 * that agent's dispatch in the current bell-ring. Consumed by DispatchGraph
 * to colour edges / pulse nodes in real time.
 */
export type DispatchProgressMap = Record<
  string,
  {
    status: "queued" | "running" | "completed" | "failed";
    startedAt: string | null;
    completedAt: string | null;
  }
>;

const POLL_INTERVAL_MS = 300;

/**
 * Pure state-machine step for the polling loop — separated from the React
 * hook so it can be unit-tested without spinning up the fake-timer rig.
 *
 * Inputs: the latest polled response.
 * Outputs:
 *   - `map` — the fresh {@link DispatchProgressMap} to push into state.
 *   - `shouldContinue` — whether to schedule another poll.
 *
 * We keep polling in two cases:
 *   1. **No rows yet** (race window between bell-ring and first row write).
 *      The client must not give up on an empty payload or it would silently
 *      miss the entire dispatch tree.
 *   2. **At least one dispatch is still active** (queued or running).
 *
 * We stop when we have rows AND every one of them is in a terminal state
 * (completed or failed). Idle polling after that just burns battery.
 */
export function tickDispatchProgress(latest: DispatchProgressResponse): {
  map: DispatchProgressMap;
  shouldContinue: boolean;
} {
  const map: DispatchProgressMap = {};
  for (const d of latest.dispatches) {
    map[d.agent.toLowerCase()] = {
      status: d.status,
      startedAt: d.startedAt,
      completedAt: d.completedAt,
    };
  }

  const anyActive = latest.dispatches.some(
    (d) => d.status === "queued" || d.status === "running",
  );
  const anyDispatches = latest.dispatches.length > 0;

  // Continue while (a) we haven't seen any rows yet (race) OR (b) at least
  // one dispatch is still active.
  const shouldContinue = !anyDispatches || anyActive;

  return { map, shouldContinue };
}

/**
 * Polls `/api/ceo/dispatches` at 300 ms while `isActive` is true and at
 * least one dispatch is not yet terminal (or the row table is still empty
 * from the race window).
 *
 * Returns a map keyed by lowercased agent name. Empty object when there's
 * no `requestId`, `isActive` is false, or before the first successful poll.
 *
 * Lifecycle notes:
 *   - `isActive` flipping true → false pauses polling but retains the last
 *     observed state, so the graph doesn't wipe when the user closes the
 *     dialogue panel.
 *   - `requestId` changing resets state to `{}` before starting the next
 *     poll loop — each bell-ring is its own session.
 *   - Unmount clears any pending timer.
 *
 * Uses a recursive `setTimeout` rather than `setInterval` to avoid timer
 * drift on slow networks and to let the loop self-terminate cleanly when
 * all dispatches reach a terminal state.
 */
export function useDispatchProgress(
  requestId: string | null,
  isActive: boolean,
): DispatchProgressMap {
  const [map, setMap] = useState<DispatchProgressMap>({});

  // Track the last-seen (requestId, isActive) combo so we can reset map
  // when the bell-ring identity changes. This is React's "adjust state
  // during render" pattern — cheaper than useEffect + setState, and the
  // lint rule against setState-in-effect doesn't apply to render-time
  // setState on a different tracking ref.
  const [lastKey, setLastKey] = useState<string | null>(null);
  const currentKey = requestId && isActive ? requestId : null;
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    // Render will be re-run with map === {} below.
    setMap({});
  }

  // Latest refs so the recursive poll closure always sees the current args
  // without forcing the effect to re-subscribe on every render. Writes live
  // in a dedicated effect to satisfy React 19's "no ref mutation during
  // render" rule.
  const requestIdRef = useRef(requestId);
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    requestIdRef.current = requestId;
    isActiveRef.current = isActive;
  }, [requestId, isActive]);

  useEffect(() => {
    if (!requestId || !isActive) return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    // Track which error messages we've already logged so we don't spam the
    // console when a transient network hiccup triggers the same fetch error
    // every 300 ms.
    const loggedErrors = new Set<string>();

    const poll = async (): Promise<void> => {
      if (cancelled) return;
      // Re-check via ref — parent may have flipped isActive off mid-poll.
      const currentRequestId = requestIdRef.current;
      const currentActive = isActiveRef.current;
      if (!currentRequestId || !currentActive) return;

      try {
        const res = await fetch(
          `/api/ceo/dispatches?requestId=${encodeURIComponent(currentRequestId)}`,
        );
        if (cancelled) return;
        if (!res.ok) {
          // Non-2xx: log once, then retry on the normal cadence. We don't
          // want auth/rate-limit blips to permanently kill the graph.
          const errKey = `status:${res.status}`;
          if (
            process.env.NODE_ENV !== "production" &&
            !loggedErrors.has(errKey)
          ) {
            loggedErrors.add(errKey);
            console.warn(
              `[useDispatchProgress] /api/ceo/dispatches responded ${res.status}`,
            );
          }
          timerId = setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }

        const body = (await res.json()) as DispatchProgressResponse;
        if (cancelled) return;

        const { map: nextMap, shouldContinue } = tickDispatchProgress(body);
        setMap(nextMap);

        if (shouldContinue && isActiveRef.current) {
          timerId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        const errKey = err instanceof Error ? err.message : "unknown";
        if (
          process.env.NODE_ENV !== "production" &&
          !loggedErrors.has(errKey)
        ) {
          loggedErrors.add(errKey);
          console.warn("[useDispatchProgress] fetch failed:", errKey);
        }
        // Transient fetch error — retry on the normal cadence.
        timerId = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    // Kick off immediately (don't wait 300 ms for the first paint).
    void poll();

    return () => {
      cancelled = true;
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [requestId, isActive]);

  return map;
}
