"use client";

import type { JSX } from "react";

/**
 * Wall inscription (sharpening detail).
 *
 * The roadmap called for "a line of Siken on the wall." Siken is under
 * copyright, so rather than quote without permission, the inscription
 * is an original line in that register — a sentence a writer might
 * underline. It lives to the right of the desk, gold-leafed and
 * small, a detail a careful user notices on the third visit.
 *
 * SSR-safe: zero effects, zero hooks. A quiet decoration.
 *
 * From the roadmap's sharpening criterion:
 *   "A detail in the Writing Room that rewards a writer's eye."
 */

export interface WallInscriptionProps {
  className?: string;
  /** Visual scale. Default subtle for the desk-edge position. */
  size?: "small" | "medium";
}

const LINE = "Every draft is the only draft. Until the next one.";

export function WallInscription({
  className,
  size = "small",
}: WallInscriptionProps): JSX.Element {
  const fontSize = size === "small" ? 11 : 14;
  const subFontSize = size === "small" ? 8 : 9;
  return (
    <figure
      aria-label="Wall inscription — Writing Room"
      className={className}
      style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        color: "#C9A84C",
        opacity: 0.7,
        textAlign: "left",
        animation: "wall-inscription-fade-in 500ms ease-out forwards",
        maxWidth: 240,
      }}
    >
      <blockquote
        style={{
          margin: 0,
          padding: 0,
          fontSize,
          lineHeight: 1.45,
          fontStyle: "italic",
          color: "#C9A84C",
        }}
      >
        &ldquo;{LINE}&rdquo;
      </blockquote>
      <figcaption
        style={{
          marginTop: 4,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: subFontSize,
          letterSpacing: "0.14em",
          color: "#8F6F2A",
          textTransform: "uppercase",
        }}
      >
        On the wall — a line someone wrote
      </figcaption>
      <style>{`
        @keyframes wall-inscription-fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 0.7; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          figure[aria-label="Wall inscription — Writing Room"] {
            animation: none;
            opacity: 0.7;
          }
        }
      `}</style>
    </figure>
  );
}
