"use client";

import type { JSX } from "react";

/**
 * PenGlowCursor.
 *
 * A gold ink-well indicator shown at the live edge of a composing card.
 * The component is CSS-animation-driven — no React state, no effects —
 * so the parent re-triggers the pulse by rendering a fresh instance via
 * a `key` prop tied to the per-token tick counter:
 *
 *   <PenGlowCursor key={penTick[tone]} />
 *
 * Each key change unmounts + remounts, and the inline CSS animation
 * plays from frame 0 — brightening to full glow, then fading back to the
 * idle 0.35 opacity.
 *
 * prefers-reduced-motion: the caller (LiveComposePanel) refuses to
 * render this component at all under reduced motion, which keeps the
 * testable surface simple.
 */
export function PenGlowCursor(): JSX.Element {
  return (
    <>
      <style>{`@keyframes pen-glow-pulse {
  0% { opacity: 0.35; box-shadow: 0 0 0 0 rgba(201,168,76,0); }
  15% { opacity: 1; box-shadow: 0 0 10px 2px rgba(201,168,76,0.85); }
  100% { opacity: 0.35; box-shadow: 0 0 0 0 rgba(201,168,76,0); }
}`}</style>
      <span
        data-pen-glow="true"
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
          opacity: 0.35,
          animation: "pen-glow-pulse 400ms ease-out",
        }}
      />
    </>
  );
}
