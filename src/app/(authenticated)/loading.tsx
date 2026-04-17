/**
 * Authenticated-segment loading state.
 * Slightly more thematic than the global loader: an "elevator ascending"
 * line that breathes vertically. Intentionally subtle — no spinner spam,
 * no full-screen takeover. Respects reduced motion.
 */

import type { JSX } from "react";

export default function AuthenticatedLoading(): JSX.Element {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading floor"
    >
      <div className="flex flex-col items-center gap-4" aria-hidden="true">
        <span className="block w-px h-12 bg-gradient-to-b from-transparent via-[var(--gold)] to-transparent motion-safe:animate-[ascend_2000ms_ease-in-out_infinite]" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--gold-dim)]">
          Ascending
        </span>
      </div>
      <span className="sr-only">Loading floor…</span>

      <style>{`
        @keyframes ascend {
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
