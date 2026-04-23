"use client";

import { useCallback, type JSX } from "react";
import { useRingPulse } from "../rings/useRingPulse";

export interface ConflictEntry {
  id: string;         // notification id
  body: string;       // "{round A} at {time A} overlaps {round B} at {time B}"
  pairId: string;     // source_entity_id — stable identifier
  createdAt: string;
}

interface ConflictsSectionProps {
  conflicts: ConflictEntry[];
}

/**
 * Red-amber section at the top of the Floor 4 tableSlot when any calendar
 * conflicts exist. Each entry pulses the ambient rings when clicked — a
 * consumer of the RingPulseContext (R7.5).
 *
 * Intentionally minimal: surface-only. Resolution (rescheduling) happens
 * in the user's external calendar — we just make the conflict visible.
 */
export function ConflictsSection({ conflicts }: ConflictsSectionProps): JSX.Element | null {
  const rings = useRingPulse();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      rings.pulse(e.clientX, e.clientY);
    },
    [rings],
  );

  if (conflicts.length === 0) return null;

  return (
    <section
      aria-label={`${conflicts.length} calendar conflict${conflicts.length > 1 ? "s" : ""}`}
      data-situation-section="conflicts"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px",
        background: "rgba(232, 64, 64, 0.06)",
        border: "1px solid rgba(232, 64, 64, 0.26)",
        borderRadius: 4,
        marginBottom: 18,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#E84040",
          fontWeight: 700,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#E84040",
            boxShadow: "0 0 8px #E84040",
            animation: "conflict-dot-pulse 1.8s ease-in-out infinite",
          }}
        />
        Conflict · {conflicts.length}
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 10,
        }}
      >
        {conflicts.map((c) => (
          <article
            key={c.id}
            tabIndex={0}
            role="button"
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                rings.pulse(rect.left + rect.width / 2, rect.top + rect.height / 2);
              }
            }}
            aria-label={`Calendar conflict: ${c.body}`}
            style={{
              padding: 12,
              background: "rgba(232, 64, 64, 0.08)",
              border: "1px solid rgba(232, 64, 64, 0.30)",
              borderRadius: 4,
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12,
              lineHeight: 1.45,
              color: "#FDF3E8",
              cursor: "pointer",
            }}
          >
            {c.body}
          </article>
        ))}
      </div>

      <style>{`
        @keyframes conflict-dot-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50%      { opacity: 0.35; transform: scale(1.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes conflict-dot-pulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
          }
        }
      `}</style>
    </section>
  );
}
