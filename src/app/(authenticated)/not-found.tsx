/**
 * Authenticated-segment 404 — for routes that fall through inside the
 * /(authenticated) group (e.g., /war-room/[id] with a missing record).
 * Keeps the user "inside" the building rather than dumping them to the
 * global 404 — which would require re-entering the lobby.
 */

import Link from "next/link";

import type { JSX } from "react";

export default function AuthenticatedNotFound(): JSX.Element {
  return (
    <section
      className="min-h-[60vh] flex items-center justify-center px-6"
      role="main"
    >
      <div
        className="max-w-lg w-full text-center motion-safe:animate-[fadeIn_400ms_ease-out_forwards] opacity-0 backdrop-blur-xl bg-[var(--tower-darkest)]/85 border border-[var(--gold)]/20 rounded-sm px-10 py-12"
        style={{ animationFillMode: "forwards" }}
      >
        <p
          className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--gold-dim)] mb-5"
          aria-hidden="true"
        >
          Floor — 404
        </p>

        <h2
          className="font-display text-3xl md:text-4xl text-[var(--gold)] mb-5"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          This room doesn&apos;t exist.
        </h2>

        <p className="text-sm text-[var(--text-primary)]/70 mb-8 leading-relaxed">
          The corridor ended at a wall. The address you followed isn&apos;t a
          door in The Tower. Take the elevator back to the Penthouse.
        </p>

        <Link
          href="/penthouse"
          className="inline-block px-5 py-2.5 border border-[var(--gold)] text-[var(--gold)] font-mono text-xs tracking-wider uppercase hover:bg-[var(--gold)]/10 transition-colors duration-200"
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
    </section>
  );
}
