"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

/**
 * R5.4 — PenGlowCursor.
 *
 * A gold ink-well indicator shown at the live edge of a composing card.
 * `active` prop flips true briefly on each token arrival; the cursor
 * brightens on active and dims (via CSS transition) on the auto-timer
 * that clears `active` 250ms after the last token.
 *
 * prefers-reduced-motion: the caller (LiveComposePanel) simply refuses
 * to render this component at all on reduced-motion, which is the
 * cleanest path and keeps the testable surface simple.
 */
export interface PenGlowCursorProps {
  /** Flips true when a new token has just arrived. */
  active: boolean;
}

export function PenGlowCursor({ active }: PenGlowCursorProps): JSX.Element {
  const [show, setShow] = useState(active);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), 250);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active]);

  return (
    <span
      data-pen-glow="true"
      data-active={show ? "true" : "false"}
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "10px",
        height: "14px",
        marginLeft: "2px",
        verticalAlign: "text-bottom",
        background:
          "linear-gradient(180deg, rgba(201,168,76,0.95) 0%, rgba(201,168,76,0.55) 100%)",
        borderRadius: "1px",
        boxShadow: show ? "0 0 10px 2px rgba(201,168,76,0.85)" : "0 0 0 0 rgba(201,168,76,0)",
        opacity: show ? 1 : 0.35,
        transition: "opacity 200ms ease-out, box-shadow 200ms ease-out",
      }}
    />
  );
}
