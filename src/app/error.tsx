"use client";

/**
 * Global error boundary for the public shell of The Tower.
 * Catches any thrown server/client error outside of the (authenticated)
 * route group. Renders a tower-themed "something went wrong" panel that
 * preserves the spatial metaphor — this is a structural failure of the
 * building, not a generic web error.
 *
 * Per Next.js App Router contract, accepts `{ error, reset }` props.
 */

import { useEffect } from "react";
import type { JSX } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorPageProps): JSX.Element {
  useEffect(() => {
    // Defer to Sentry boundary in production; in dev surface via console
    // (intentional dev-only — no console.* in shipped runtime paths).
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[error.tsx] caught error:", error);
    }
  }, [error]);

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-6 bg-[var(--tower-darkest)] text-[var(--text-primary)]"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="max-w-md w-full text-center motion-safe:animate-[fadeIn_400ms_ease-out_forwards] opacity-0"
        style={{ animationFillMode: "forwards" }}
      >
        <p
          className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--gold-dim)] mb-6"
          aria-hidden="true"
        >
          Tower Status — Anomaly Detected
        </p>

        <h1
          className="font-display text-4xl md:text-5xl text-[var(--gold)] mb-6"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Something went wrong in The Tower.
        </h1>

        <p className="text-base text-[var(--text-primary)]/70 mb-10 leading-relaxed">
          A structural fault has been detected. The concierge has been notified.
          You may attempt the operation again, or return to the lobby.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 border border-[var(--gold)] text-[var(--gold)] font-mono text-sm tracking-wider uppercase hover:bg-[var(--gold)]/10 transition-colors duration-200 cursor-pointer"
            aria-label="Retry the failed operation"
          >
            Try Again
          </button>
          <a
            href="/lobby"
            className="px-6 py-3 border border-[var(--text-primary)]/20 text-[var(--text-primary)]/80 font-mono text-sm tracking-wider uppercase hover:border-[var(--text-primary)]/40 transition-colors duration-200"
          >
            Return to Lobby
          </a>
        </div>

        {error.digest ? (
          <p className="font-mono text-[10px] text-[var(--text-primary)]/30 mt-10 tracking-wider">
            ref: {error.digest}
          </p>
        ) : null}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </main>
  );
}
