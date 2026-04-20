"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Milestone } from "@/lib/progression/milestones";

const PROGRESSION_EVENT = "tower:progression:check";

interface UseProgressionMilestonesResult {
  milestones: Milestone[];
  dismiss: (id: string) => void;
  checkNow: () => void;
}

/**
 * Subscribes the UI to the server-side progression engine.
 *
 * `/api/progression` (POST) re-evaluates the user's metrics and returns ONLY
 * milestones whose thresholds were just crossed — the DB row in
 * `progression_milestones` already guards against duplicates, so a page
 * refresh never re-surfaces a previously-seen milestone.
 *
 * Trigger points:
 *   - on mount (catches unlocks that happened before the tab loaded)
 *   - on `visibilitychange` / `focus` (catches anything that happened while
 *     the user was on another tab)
 *   - on a custom `tower:progression:check` window event — dispatch it from
 *     CRUD actions to surface a milestone instantly instead of waiting for
 *     the user to tab away and back. See `triggerProgressionCheck()`.
 */
export function useProgressionMilestones(): UseProgressionMilestonesResult {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const inFlight = useRef(false);

  const checkNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/progression", { method: "POST" });
      if (!res.ok) return;
      const { newlyUnlocked } = (await res.json()) as {
        newlyUnlocked?: Milestone[];
      };
      if (!Array.isArray(newlyUnlocked) || newlyUnlocked.length === 0) return;
      const fresh = newlyUnlocked.filter((m) => !seenIds.current.has(m.id));
      if (fresh.length === 0) return;
      fresh.forEach((m) => seenIds.current.add(m.id));
      setMilestones((prev) => [...prev, ...fresh]);
    } catch {
      // Progression toasts are a non-critical UX layer; a failed check is
      // fine — the next visibilitychange / focus will retry.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    checkNow();

    const onMaybeCheck = () => {
      if (document.visibilityState === "visible") checkNow();
    };
    const onBusEvent = () => checkNow();

    document.addEventListener("visibilitychange", onMaybeCheck);
    window.addEventListener("focus", onMaybeCheck);
    window.addEventListener(PROGRESSION_EVENT, onBusEvent);

    return () => {
      document.removeEventListener("visibilitychange", onMaybeCheck);
      window.removeEventListener("focus", onMaybeCheck);
      window.removeEventListener(PROGRESSION_EVENT, onBusEvent);
    };
  }, [checkNow]);

  const dismiss = useCallback((id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { milestones, dismiss, checkNow };
}

/**
 * Fires a progression check from anywhere in the app. Safe to call from any
 * client context — no-ops on the server.
 *
 * Useful immediately after a mutation that could cross a threshold (create
 * application, add contact, save cover letter, etc.).
 */
export function triggerProgressionCheck(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROGRESSION_EVENT));
}
