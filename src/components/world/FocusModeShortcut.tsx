"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type JSX,
} from "react";
import { toggleFocusMode } from "@/app/(authenticated)/actions/focus-mode";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { GATE_CONFIG } from "@/lib/config/gate-config";

interface FocusModeShortcutProps {
  /** Current focusMode value, threaded from the server layout. */
  focusMode: boolean;
}

const TOAST_DURATION_MS = 1400;

/**
 * FocusModeShortcut — keyboard listener + transient toast for Focus Mode.
 *
 * Mounts on every authenticated page (regardless of focus mode state) so
 * the listener can flip the toggle in either direction. Calls the server
 * action `toggleFocusMode` inside `startTransition`; the action writes
 * the cookie and revalidates the layout, which re-renders WorldShell with
 * the new prop on the next server-component pass.
 *
 * The transient toast is not the source of truth — `props.focusMode` is.
 * The toast renders only what the keypress just changed to, then
 * auto-clears so future toggles re-announce.
 *
 * Gated on `GATE_CONFIG.flags.focusModeEnabled`. While false (default
 * during the activation-gauntlet beta) the listener is not registered
 * and the toast slot stays unmounted; the `tower_focus_mode` cookie
 * and the `toggleFocusMode` server action remain intact and become
 * visible again the moment the flag flips.
 */
export function FocusModeShortcut({
  focusMode,
}: FocusModeShortcutProps): JSX.Element | null {
  const focusModeEnabled = GATE_CONFIG.flags.focusModeEnabled;
  const reducedMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [toastText, setToastText] = useState<string>("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPendingRef = useRef(false);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    if (!focusModeEnabled) return;
    function onKey(e: KeyboardEvent) {
      const isMatch =
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "f";
      if (!isMatch) return;

      // Guard against rapid double-press while a server action is mid-flight —
      // two concurrent toggles would race against each other on the cookie
      // read-modify-write.
      if (isPendingRef.current) {
        e.preventDefault();
        return;
      }

      // Skip when the user is typing in a form field — Cmd+Shift+F is also
      // a useful "find next" / formatting key inside some editors.
      const target = e.target;
      if (target instanceof HTMLInputElement) return;
      if (target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;

      e.preventDefault();

      // Optimistic toast — flips off the current prop value to whatever
      // the action will compute next.
      const nextLabel = focusMode ? "Focus Mode OFF" : "Focus Mode ON";
      setToastText(nextLabel);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToastText("");
        toastTimerRef.current = null;
      }, TOAST_DURATION_MS);

      startTransition(() => {
        void toggleFocusMode().catch(() => {
          // The action itself never rejects in practice, but if anything
          // does (e.g. requireUser bounce), restore the toast to neutral.
          setToastText("");
        });
      });
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, focusModeEnabled, startTransition]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  if (!focusModeEnabled) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed left-1/2 top-6 z-[60] -translate-x-1/2"
      style={{
        opacity: toastText ? 1 : 0,
        transition: reducedMotion ? "none" : "opacity 180ms ease-out",
      }}
    >
      {toastText ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(201, 168, 76, 0.95)",
            padding: "10px 18px",
            borderRadius: "999px",
            background: "rgba(10, 12, 25, 0.78)",
            border: "1px solid rgba(201, 168, 76, 0.3)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 24px -12px rgba(0,0,0,0.6)",
          }}
        >
          {toastText}
        </div>
      ) : null}
    </div>
  );
}
