"use client";

import type { CSSProperties, JSX } from "react";
import type { OrreryPlanet } from "@/lib/orrery/types";

/**
 * R9.3 — PlanetDetailPanel.
 *
 * The slide-up panel revealed when a planet is focused in the Orrery. Anchored
 * to the bottom of its relative parent (the Orrery container), NOT to the
 * viewport — this layers over the orrery scene rather than blocking the rest
 * of the floor. role="dialog" + aria-modal="false" because it's a non-blocking
 * reveal: the orrery and the rest of the floor stay interactive.
 *
 * Visual language: glass surface (#1A1A2E @ 0.92 + blur 16px), gold accent
 * border on the status badge (#C9A84C), cool-blue text accents on labels —
 * keeping with the Observatory's water-window aesthetic.
 *
 * History context (matchScore, appliedAt, lastActivityAt) reads directly off
 * the OrreryPlanet shape; no further fetches. Future enhancements (full
 * timeline, inline notes) will mount inside this panel.
 */

interface Props {
  planet: OrreryPlanet;
  onClose: () => void;
}

const TOWER_GOLD = "#C9A84C";
const TOWER_GLASS_BG = "rgba(26, 26, 46, 0.92)";
const COOL_BLUE_LABEL = "rgba(168, 216, 255, 0.85)";
const COOL_BLUE_DIM = "rgba(168, 216, 255, 0.55)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.95)";

/**
 * Humanize an enum-style status string. "interview_scheduled" →
 * "Interview scheduled". Lowercase tail words preserved so the panel doesn't
 * read like a Bloomberg ticker shouting at the user.
 */
function humanizeStatus(status: string): string {
  if (!status) return "—";
  const words = status.split("_");
  if (words.length === 0) return status;
  const [head, ...tail] = words;
  const headCap = head.charAt(0).toUpperCase() + head.slice(1);
  return [headCap, ...tail].join(" ");
}

function formatPercent(score: number | null): string {
  if (score === null || Number.isNaN(score)) return "—";
  return `${(score * 100).toFixed(0)}%`;
}

function formatDateOrFallback(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString();
}

export function PlanetDetailPanel({ planet, onClose }: Props): JSX.Element {
  const panelStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "50%",
    overflowY: "auto",
    zIndex: 3,
    background: TOWER_GLASS_BG,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    color: TEXT_PRIMARY,
    borderTop: `1px solid ${COOL_BLUE_DIM}`,
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    padding: "20px 24px 24px",
    boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.45)",
    animation: "orrery-detail-slide-up 280ms ease-out",
  };

  const headerRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "16px",
  };

  const headerLeftStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const titleStyle: CSSProperties = {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 500,
    lineHeight: 1.3,
    color: TEXT_PRIMARY,
    margin: 0,
  };

  const badgeStyle: CSSProperties = {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: TOWER_GOLD,
    border: `1px solid ${TOWER_GOLD}`,
    borderRadius: "4px",
    fontFamily: "JetBrains Mono, monospace",
    alignSelf: "flex-start",
  };

  const closeBtnStyle: CSSProperties = {
    background: "transparent",
    border: "none",
    color: COOL_BLUE_LABEL,
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    padding: 0,
  };

  const dlStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 160px) 1fr",
    rowGap: "10px",
    columnGap: "16px",
    margin: 0,
    fontSize: "13px",
  };

  const dtStyle: CSSProperties = {
    color: COOL_BLUE_LABEL,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "11px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    margin: 0,
  };

  const ddStyle: CSSProperties = {
    color: TEXT_PRIMARY,
    fontFamily: "Satoshi, system-ui, sans-serif",
    margin: 0,
  };

  // Click-on-panel must NOT bubble up to the backdrop's onClick (which would
  // dismiss the panel). Stop propagation at the root of the panel.
  function stopBubble(e: React.MouseEvent): void {
    e.stopPropagation();
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="planet-detail-title"
      style={panelStyle}
      onClick={stopBubble}
      data-testid="orrery-planet-detail"
    >
      <div style={headerRowStyle}>
        <div style={headerLeftStyle}>
          <h3 id="planet-detail-title" style={titleStyle}>
            {planet.role} at {planet.label}
          </h3>
          <span style={badgeStyle}>{humanizeStatus(planet.status)}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          style={closeBtnStyle}
        >
          ×
        </button>
      </div>

      <dl style={dlStyle}>
        <dt style={dtStyle}>Tier</dt>
        <dd style={ddStyle}>Tier {planet.tier}</dd>

        <dt style={dtStyle}>Status</dt>
        <dd style={ddStyle}>{humanizeStatus(planet.status)}</dd>

        <dt style={dtStyle}>Match score</dt>
        <dd style={ddStyle}>{formatPercent(planet.matchScore)}</dd>

        <dt style={dtStyle}>Applied</dt>
        <dd style={ddStyle}>
          {formatDateOrFallback(planet.appliedAt, "Not yet applied")}
        </dd>

        <dt style={dtStyle}>Last activity</dt>
        <dd style={ddStyle}>{formatDateOrFallback(planet.lastActivityAt, "—")}</dd>
      </dl>

      <style>{`
        @keyframes orrery-detail-slide-up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="orrery-planet-detail"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
