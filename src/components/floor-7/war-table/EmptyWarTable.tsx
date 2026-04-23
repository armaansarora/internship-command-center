"use client";

import type { JSX } from "react";

interface EmptyWarTableProps {
  onSummonCRO: () => void;
  hasTargetProfile?: boolean;
}

/**
 * Empty state for a cold war table. Not an apology — an invitation. Matches
 * the brief's non-negotiable "empty states must invite, no 'No data yet'".
 *
 * Visual: a folded, unopened dossier on a wooden desk, with a single line
 * from the CRO and one CTA that opens the dialogue panel. Reuses the mahogany
 * gold palette so it feels like it belongs on the floor, not pasted on.
 */
export function EmptyWarTable({
  onSummonCRO,
  hasTargetProfile = false,
}: EmptyWarTableProps): JSX.Element {
  const headline = hasTargetProfile
    ? "The war table is quiet."
    : "This floor is waiting.";
  const subline = hasTargetProfile
    ? "Your targets are on record. Ask the CRO to run Job Discovery — the table will fill itself."
    : "Tell the CRO what you want. The CRO hunts. The table fills itself.";
  const ctaLabel = hasTargetProfile
    ? "SUMMON THE CRO"
    : "DECLARE MY TARGETS";

  return (
    <div
      role="region"
      aria-label="Empty war table — invitation to start"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "360px",
        padding: "32px 24px",
        background:
          "radial-gradient(ellipse at center, rgba(30, 58, 95, 0.12) 0%, rgba(10, 22, 40, 0.0) 70%)",
        borderRadius: "2px",
        gap: "18px",
        textAlign: "center",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      {/* Dossier glyph — SVG so it scales cleanly and stays accessible */}
      <svg
        aria-hidden="true"
        width="72"
        height="92"
        viewBox="0 0 72 92"
        fill="none"
      >
        <defs>
          <linearGradient id="dossier-grad" x1="0" y1="0" x2="0" y2="92">
            <stop offset="0%" stopColor="#3a2714" />
            <stop offset="100%" stopColor="#1a0f08" />
          </linearGradient>
          <linearGradient id="dossier-edge" x1="0" y1="0" x2="0" y2="92">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8b6f3a" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="8"
          width="60"
          height="78"
          rx="2"
          fill="url(#dossier-grad)"
          stroke="url(#dossier-edge)"
          strokeWidth="1"
        />
        {/* Wax seal */}
        <circle cx="34" cy="47" r="9" fill="#8b1a1a" opacity="0.75" />
        <circle cx="34" cy="47" r="9" fill="url(#dossier-edge)" opacity="0.3" />
        {/* Tab */}
        <rect
          x="26"
          y="3"
          width="20"
          height="8"
          rx="1"
          fill="#2a1a10"
          stroke="#8b6f3a"
          strokeWidth="0.5"
        />
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2
          style={{
            fontFamily: "Playfair Display, serif",
            fontSize: "28px",
            fontWeight: 500,
            color: "#E8F4FD",
            margin: 0,
            letterSpacing: "0.01em",
          }}
        >
          {headline}
        </h2>
        <p
          style={{
            fontSize: "12px",
            color: "#7FB3D3",
            maxWidth: "420px",
            lineHeight: 1.55,
            letterSpacing: "0.02em",
            margin: "0 auto",
          }}
        >
          {subline}
        </p>
      </div>

      <button
        type="button"
        onClick={onSummonCRO}
        aria-label={
          hasTargetProfile
            ? "Summon the CRO to run Job Discovery"
            : "Summon the CRO to declare your targets"
        }
        style={{
          appearance: "none",
          padding: "10px 22px",
          borderRadius: "2px",
          border: "1px solid #C9A84C",
          background:
            "linear-gradient(180deg, rgba(201, 168, 76, 0.14) 0%, rgba(201, 168, 76, 0.04) 100%)",
          color: "#C9A84C",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition:
            "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background =
            "linear-gradient(180deg, rgba(201, 168, 76, 0.22) 0%, rgba(201, 168, 76, 0.1) 100%)";
          el.style.color = "#F2E5C7";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background =
            "linear-gradient(180deg, rgba(201, 168, 76, 0.14) 0%, rgba(201, 168, 76, 0.04) 100%)";
          el.style.color = "#C9A84C";
        }}
      >
        {ctaLabel}
      </button>

      <p
        aria-hidden="true"
        style={{
          fontSize: "9px",
          color: "#4A7A9B",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        FLOOR 7 · THE WAR ROOM
      </p>
    </div>
  );
}
