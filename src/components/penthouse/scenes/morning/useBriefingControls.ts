"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Controls state + keyboard for the Morning Briefing reveal.
 *
 * Returns:
 *  - `index`       : the beat currently being revealed (-1 before mount, then
 *                    0, 1, …). A beat's `revealed` flag is true iff its index
 *                    is ≤ `index`.
 *  - `advance()`   : reveal the next beat (no-op when all revealed).
 *  - `skipAll()`   : jump to fully-revealed state + mark scene done.
 *  - `done`        : true once all beats are revealed (either via advance or
 *                    skipAll).
 *
 * Bindings:
 *  - `Esc`   → skipAll and signal `onSkip` (parent reveals RestPanel)
 *  - `Space` → advance (or skipAll when already on the last beat)
 *  - 8s idle timer auto-advances; reset on any user action.
 */
export function useBriefingControls(options: {
  beatsCount: number;
  enabled?: boolean;
  initialIndex?: number;
  autoAdvanceMs?: number;
  onSkip?: () => void;
  onDone?: () => void;
}) {
  const {
    beatsCount,
    enabled = true,
    initialIndex = 0,
    autoAdvanceMs = 8000,
    onSkip,
    onDone,
  } = options;

  const [index, setIndex] = useState<number>(initialIndex);
  const [done, setDone] = useState<boolean>(beatsCount === 0);
  const timerRef = useRef<number>(0);

  const advance = () => {
    setIndex((prev) => {
      const next = Math.min(prev + 1, beatsCount - 1);
      if (next === beatsCount - 1) {
        setDone(true);
        onDone?.();
      }
      return next;
    });
  };

  const skipAll = () => {
    setIndex(Math.max(beatsCount - 1, 0));
    setDone(true);
    onDone?.();
    onSkip?.();
  };

  // Auto-advance timer — resets on any action.
  useEffect(() => {
    if (!enabled || done || beatsCount === 0) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(advance, autoAdvanceMs);
    return () => window.clearTimeout(timerRef.current);
    // `advance` is stable via functional setState; keep dep list minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, enabled, done, autoAdvanceMs, beatsCount]);

  // Keyboard bindings.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skipAll();
        return;
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (done) {
          onSkip?.();
          return;
        }
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, done, beatsCount]);

  return { index, advance, skipAll, done };
}
