"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UndoPhase = "idle" | "in_flight" | "cancelling" | "cancelled" | "too_late";

export interface UndoBarState {
  phase: UndoPhase;
  outreachId: string | null;
  recipient: string | null;
  /** Epoch ms when the send window closes (approveResponse.sendAfter). */
  sendAfterMs: number | null;
}

export interface UndoBarController {
  state: UndoBarState;
  /** Start a new in-flight undo window. Replaces any existing bar state. */
  dispatch(args: { outreachId: string; recipient: string; sendAfterIso: string }): void;
  /** User clicked Cancel. POSTs /api/outreach/undo and transitions accordingly. */
  cancel(): Promise<void>;
  /** Dismiss the bar (used by the bar itself after a terminal phase fade). */
  dismiss(): void;
}

const IDLE: UndoBarState = {
  phase: "idle",
  outreachId: null,
  recipient: null,
  sendAfterMs: null,
};

/** How long the bar stays visible on terminal phases before auto-fading. */
const CANCELLED_LINGER_MS = 2000;
const TOO_LATE_LINGER_MS = 3000;

interface HookOptions {
  /**
   * Override the fetch used to call /api/outreach/undo. Dependency-inject
   * for tests — real callers use the default (global fetch).
   */
  fetchImpl?: typeof fetch;
}

/**
 * Phase machine for the Situation Room's in-world undo bar. Zero toast,
 * zero alert — the phase string drives all visible state in the UI layer.
 *
 * Phases:
 *   idle          nothing showing
 *   in_flight     countdown running, user can click Cancel
 *   cancelling    fetch to /api/outreach/undo pending
 *   cancelled     undo succeeded — bar shows "Caught it" for 2s then idle
 *   too_late      undo returned 409 — bar shows "Already left" for 3s then idle
 *
 * The countdown drains visually via sendAfterMs (epoch) being compared to
 * real-time in the UI. If the clock reaches sendAfterMs without the user
 * clicking Cancel, the bar auto-fades to idle (cron has picked up the row).
 */
export function useUndoBarController(opts: HookOptions = {}): UndoBarController {
  const [state, setState] = useState<UndoBarState>(IDLE);
  const lingerTimerRef = useRef<number | null>(null);
  // Mirror state into a ref so async callbacks (cancel()) can read the
  // latest state synchronously. Reading state through setState(updater)
  // would defer the read to the next render — too late for side-effects.
  const stateRef = useRef<UndoBarState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const fetchImpl = opts.fetchImpl ?? fetch;

  const clearLinger = useCallback(() => {
    if (lingerTimerRef.current !== null) {
      window.clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }
  }, []);

  const scheduleLinger = useCallback(
    (ms: number) => {
      clearLinger();
      lingerTimerRef.current = window.setTimeout(() => {
        setState(IDLE);
        lingerTimerRef.current = null;
      }, ms);
    },
    [clearLinger],
  );

  const dispatch = useCallback<UndoBarController["dispatch"]>(
    ({ outreachId, recipient, sendAfterIso }) => {
      clearLinger();
      setState({
        phase: "in_flight",
        outreachId,
        recipient,
        sendAfterMs: new Date(sendAfterIso).getTime(),
      });
    },
    [clearLinger],
  );

  const cancel = useCallback<UndoBarController["cancel"]>(async () => {
    // Guard: only valid from in_flight. Read state synchronously via ref —
    // setState(updater) defers the read to the next render, which is too
    // late for our "should we fetch?" decision.
    if (stateRef.current.phase !== "in_flight") return;
    const currentId = stateRef.current.outreachId;
    if (!currentId) return;
    setState((s) => ({ ...s, phase: "cancelling" }));

    let response: Response;
    try {
      response = await fetchImpl("/api/outreach/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentId }),
      });
    } catch {
      // Network failure falls through to too_late (safest — the DB has the
      // truth and the user should not believe the send was cancelled).
      setState((s) => ({ ...s, phase: "too_late" }));
      scheduleLinger(TOO_LATE_LINGER_MS);
      return;
    }

    if (response.ok) {
      setState((s) => ({ ...s, phase: "cancelled" }));
      scheduleLinger(CANCELLED_LINGER_MS);
    } else {
      // 409 too_late OR any other non-OK. Treat as too_late.
      setState((s) => ({ ...s, phase: "too_late" }));
      scheduleLinger(TOO_LATE_LINGER_MS);
    }
  }, [fetchImpl, scheduleLinger]);

  const dismiss = useCallback(() => {
    clearLinger();
    setState(IDLE);
  }, [clearLinger]);

  useEffect(() => {
    // Cleanup on unmount so stray timers don't update after the tree is gone.
    return clearLinger;
  }, [clearLinger]);

  // Auto-transition from in_flight → idle when the window expires without
  // a cancel click. The cron has picked up the row; no confirmation is
  // surfaced — next render of Floor 4 shows the row as sent.
  useEffect(() => {
    if (state.phase !== "in_flight" || state.sendAfterMs === null) return;
    const remaining = state.sendAfterMs - Date.now();
    if (remaining <= 0) {
      setState(IDLE);
      return;
    }
    const t = window.setTimeout(() => setState(IDLE), remaining);
    return () => window.clearTimeout(t);
  }, [state.phase, state.sendAfterMs]);

  return { state, dispatch, cancel, dismiss };
}
