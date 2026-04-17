/**
 * Global loading state — quiet pulsing gold dot.
 * Intentionally minimal: not flashy, respects reduced motion, fades the
 * dot to fully visible (no animation) when the user prefers static UI.
 */

import type { JSX } from "react";

export default function Loading(): JSX.Element {
  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-[var(--tower-darkest)]"
      role="status"
      aria-live="polite"
      aria-label="Loading The Tower"
    >
      <span
        className="block w-2 h-2 rounded-full bg-[var(--gold)] motion-safe:animate-[pulseGold_1600ms_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <span className="sr-only">Loading…</span>

      <style>{`
        @keyframes pulseGold {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
