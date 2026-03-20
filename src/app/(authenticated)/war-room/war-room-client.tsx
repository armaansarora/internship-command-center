"use client";

import type { JSX } from "react";
import { WarRoomScene } from "@/components/floor-7/WarRoomScene";
import type { WarRoomStats } from "@/components/floor-7/WarRoomScene";

// ── Placeholder stats — will be replaced with live Supabase data ──────────
const PLACEHOLDER_STATS: WarRoomStats = {
  total:        0,
  screening:    0,
  interviewing: 0,
  offers:       0,
  stale:        0,
};

/**
 * WarRoomClient — client-side orchestrator for Floor 7.
 *
 * Renders WarRoomScene with placeholder slots for:
 *   - CRO character (top area)
 *   - War table / kanban (bottom area)
 *
 * Stats will be replaced with real Supabase query results in Phase 2.
 */
export function WarRoomClient(): JSX.Element {
  return (
    <WarRoomScene
      stats={PLACEHOLDER_STATS}
      characterSlot={<CharacterAreaPlaceholder />}
      tableSlot={<WarTablePlaceholder />}
    />
  );
}

/* ── CRO Character area placeholder ─────────────────────────────────────── */
function CharacterAreaPlaceholder(): JSX.Element {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: "16px",
        gap: "12px",
      }}
    >
      {/* Designation label */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(30, 144, 255, 0.55)",
          marginBottom: "4px",
        }}
      >
        CRO · CHIEF RECON OFFICER
      </div>

      {/* Silhouette placeholder */}
      <div
        aria-hidden="true"
        style={{
          width: "72px",
          height: "108px",
          borderRadius: "36px 36px 8px 8px",
          background:
            "linear-gradient(to bottom, rgba(30, 144, 255, 0.1) 0%, rgba(30, 144, 255, 0.04) 100%)",
          border: "1px solid rgba(30, 144, 255, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Scanline effect on silhouette */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(30, 144, 255, 0.06) 3px, rgba(30, 144, 255, 0.06) 4px)",
            backgroundSize: "100% 4px",
          }}
        />
      </div>
    </div>
  );
}

/* ── War Table placeholder ───────────────────────────────────────────────── */
function WarTablePlaceholder(): JSX.Element {
  const COLUMNS = [
    { label: "RECON",            color: "#4A7A9B", count: 0 },
    { label: "OPS SUBMITTED",    color: "#1E90FF", count: 0 },
    { label: "FIRST CONTACT",    color: "#00D4FF", count: 0 },
    { label: "ACTIVE ENGAGEMENT",color: "#F59E0B", count: 0 },
    { label: "INTEL REVIEW",     color: "#F59E0B", count: 0 },
    { label: "MISSION SUCCESS",  color: "#00FF87", count: 0 },
  ] as const;

  return (
    <div
      style={{
        padding: "24px 24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        minHeight: "100%",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(30, 58, 95, 0.6)",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#7FB3D3",
          }}
        >
          OPERATIONS BOARD · PHASE 1
        </div>

        {/* Add Application button */}
        <button
          type="button"
          className="tactical-btn tactical-btn-primary"
          aria-label="Add new application"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          ADD APPLICATION
        </button>
      </div>

      {/* Kanban columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "12px",
          flex: 1,
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.label}
            className="tactical-panel data-panel"
            style={{
              minHeight: "200px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {/* Column header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "8px",
                borderBottom: `1px solid rgba(30, 58, 95, 0.5)`,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: col.color,
                }}
              >
                {col.label}
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  color: col.color,
                  opacity: 0.7,
                  background: `${col.color}18`,
                  border: `1px solid ${col.color}33`,
                  borderRadius: "3px",
                  padding: "1px 5px",
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {col.count}
              </div>
            </div>

            {/* Empty state */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  color: "rgba(74, 122, 155, 0.45)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                NO ACTIVE OPS
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
