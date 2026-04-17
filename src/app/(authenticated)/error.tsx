"use client";

/**
 * Authenticated-segment error boundary.
 * Catches errors thrown inside any /penthouse, /war-room, /rolodex-lounge,
 * etc. floor without unmounting the WorldShell. Tower-themed panel that
 * matches the in-world aesthetic — the user is still "inside" the building.
 *
 * Per Next.js App Router contract, accepts `{ error, reset }` props.
 */

import { useEffect } from "react";
import type { JSX } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthenticatedError({
  error,
  reset,
}: ErrorPageProps): JSX.Element {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[(authenticated)/error.tsx] caught error:", error);
    }
  }, [error]);

  return (
    <section
      className="min-h-[60vh] flex items-center justify-center px-6"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="max-w-lg w-full text-center motion-safe:animate-[fadeIn_400ms_ease-out_forwards] opacity-0 backdrop-blur-xl bg-[var(--tower-darkest)]/85 border border-[var(--gold)]/20 rounded-sm px-10 py-12"
        style={{ animationFillMode: "forwards" }}
      >
        <p
          className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--gold-dim)] mb-5"
          aria-hidden="true"
        >
          Floor Status — Disrupted
        </p>

        <h2
          className="font-display text-3xl md:text-4xl text-[var(--gold)] mb-5"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          This floor is temporarily out of service.
        </h2>

        <p className="text-sm text-[var(--text-primary)]/70 mb-8 leading-relaxed">
          A fault interrupted what you were doing. The room is still here —
          retry the action, or take the elevator elsewhere.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 border border-[var(--gold)] text-[var(--gold)] font-mono text-xs tracking-wider uppercase hover:bg-[var(--gold)]/10 transition-colors duration-200 cursor-pointer"
            aria-label="Retry the failed operation"
          >
            Try Again
          </button>
          <a
            href="/penthouse"
            className="px-5 py-2.5 border border-[var(--text-primary)]/20 text-[var(--text-primary)]/80 font-mono text-xs tracking-wider uppercase hover:border-[var(--text-primary)]/40 transition-colors duration-200"
          >
            Penthouse
          </a>
        </div>

        {error.digest ? (
          <p className="font-mono text-[10px] text-[var(--text-primary)]/30 mt-8 tracking-wider">
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
    </section>
  );
}
