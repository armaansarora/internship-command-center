import type { JSX } from "react";

/**
 * Penthouse Suspense fallback. Matches the tower-themed loading.tsx aesthetic
 * (gold ascension line + monospace label) so the transition feels native to
 * the building metaphor — no jarring spinners.
 */
export function PenthousePlaceholder(): JSX.Element {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      <div className="flex flex-col items-center gap-4" aria-hidden="true">
        <span className="block w-px h-12 bg-gradient-to-b from-transparent via-[var(--gold)] to-transparent motion-safe:animate-[ph-pulse_2000ms_ease-in-out_infinite]" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold-dim)]">
          Reading the floor
        </span>
      </div>
      <span className="sr-only">Loading penthouse data…</span>

      <style>{`
        @keyframes ph-pulse {
          0%, 100% { opacity: 0.3; transform: translateY(4px); }
          50%      { opacity: 1;   transform: translateY(-4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
