"use client";

import type { JSX } from "react";
import type { BinderSummary } from "@/lib/db/queries/debriefs-rest";
import { binderAging } from "./shelf-aging";

/**
 * R6.8 — A single binder spine on the Debrief shelf.
 *
 * Leather-look spine, embossed company name rotated -90deg, round
 * sub-label ("R1" / "R2" / ...), and aging effects (dust, sepia,
 * lean) driven by the pure `binderAging` helper.
 *
 * The binder is the whole interactive unit: clicking the <button>
 * opens the flip-open dialog. Accessible name includes company,
 * round and score so the shelf is navigable by screen reader.
 */

interface Props {
  binder: BinderSummary;
  indexFromLeft: number;
  totalOnShelf: number;
  onOpen: (id: string) => void;
}

export function BinderSpine({
  binder,
  indexFromLeft,
  totalOnShelf,
  onOpen,
}: Props): JSX.Element {
  const { dust, yellowing, leanDeg } = binderAging(indexFromLeft, totalOnShelf);
  // Warm leather hue spread, stable per company via first-char code.
  const leatherHue = 22 + (binder.company.charCodeAt(0) % 18);

  return (
    <button
      type="button"
      aria-label={`Debrief binder — ${binder.company}, round ${binder.round}, score ${binder.totalScore}`}
      onClick={() => onOpen(binder.id)}
      style={{
        width: 34,
        height: 180,
        borderRadius: "2px 2px 0 0",
        padding: 0,
        cursor: "pointer",
        position: "relative",
        transform: `rotate(${leanDeg}deg)`,
        transformOrigin: "bottom center",
        filter: yellowing > 0 ? `sepia(${yellowing})` : undefined,
        background: `linear-gradient(to right,
          hsl(${leatherHue}, 42%, 22%) 0%,
          hsl(${leatherHue}, 48%, 30%) 18%,
          hsl(${leatherHue}, 44%, 26%) 50%,
          hsl(${leatherHue}, 48%, 32%) 82%,
          hsl(${leatherHue}, 42%, 20%) 100%)`,
        boxShadow: "inset 0 0 6px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.5)",
        border: `1px solid hsl(${leatherHue}, 40%, 14%)`,
      }}
    >
      {dust > 0 && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(circle at 20% 10%, rgba(255,255,240,${dust}) 0 1px, transparent 2px),
              radial-gradient(circle at 70% 30%, rgba(255,255,240,${dust * 0.8}) 0 1px, transparent 2px),
              radial-gradient(circle at 40% 60%, rgba(255,255,240,${dust * 0.6}) 0 1px, transparent 2px)`,
            backgroundSize: "20px 20px",
            pointerEvents: "none",
          }}
        />
      )}
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-90deg)",
          whiteSpace: "nowrap",
          fontSize: 10,
          color: "#E8D7B3",
          textShadow: "0 1px 0 rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.1)",
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: "0.08em",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {binder.company}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: 4,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 7,
          color: "#E8D7B3",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.08em",
          opacity: 0.75,
        }}
      >
        R{binder.round}
      </span>
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 12,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(0,0,0,0.3)",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          bottom: 22,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}
