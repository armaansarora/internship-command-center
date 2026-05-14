"use client";

import type { JSX } from "react";
import { FileText } from "lucide-react";

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
      <div
        aria-hidden="true"
        style={{
          width: 72,
          height: 92,
          position: "relative",
          borderRadius: 2,
          border: "1px solid rgba(201,168,76,0.34)",
          background: "linear-gradient(180deg, #3a2714, #1a0f08)",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 18px 38px rgba(0,0,0,0.34)",
        }}
      >
        <span style={{ position: "absolute", top: -6, width: 20, height: 8, borderRadius: 1, border: "1px solid rgba(139,111,58,0.7)", background: "#2a1a10" }} />
        <FileText size={28} strokeWidth={1.2} color="rgba(201,168,76,0.58)" />
        <span style={{ position: "absolute", top: 38, width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.34), rgba(139,26,26,0.75))" }} />
      </div>

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
          minHeight: "44px",
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
          color: "#7197B5",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        FLOOR 7 · THE WAR ROOM
      </p>
    </div>
  );
}
