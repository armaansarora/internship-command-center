/**
 * Global 404 — "this floor doesn't exist."
 * Rendered for any route that doesn't match a defined page.
 * Keeps the building metaphor: an unknown floor on the elevator panel.
 */

import Link from "next/link";

import type { JSX } from "react";

export default function NotFound(): JSX.Element {
  return (
    <main
      className="min-h-dvh flex items-center justify-center px-6 bg-[var(--tower-darkest)] text-[var(--text-primary)]"
      role="main"
    >
      <div
        className="max-w-md w-full text-center motion-safe:animate-[fadeIn_400ms_ease-out_forwards] opacity-0"
        style={{ animationFillMode: "forwards" }}
      >
        <p
          className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--gold-dim)] mb-6"
          aria-hidden="true"
        >
          Floor — 404
        </p>

        <h1
          className="font-display text-5xl md:text-6xl text-[var(--gold)] mb-6"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          This floor doesn&apos;t exist.
        </h1>

        <p className="text-base text-[var(--text-primary)]/70 mb-10 leading-relaxed">
          The elevator paused at an empty shaft. The number you pressed
          doesn&apos;t correspond to any floor in The Tower.
        </p>

        <Link
          href="/penthouse"
          className="inline-block px-6 py-3 border border-[var(--gold)] text-[var(--gold)] font-mono text-sm tracking-wider uppercase hover:bg-[var(--gold)]/10 transition-colors duration-200"
        >
          Return to the Penthouse
        </Link>
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
