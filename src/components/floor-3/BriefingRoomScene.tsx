"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import "@/styles/floor-3.css";
import { BriefingRoomTicker } from "./BriefingRoomTicker";
import type { BriefingRoomStats } from "./BriefingRoomTicker";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type { BriefingRoomStats };

interface BriefingRoomSceneProps {
  stats: BriefingRoomStats;
  children?: React.ReactNode;
  /** Slot for CPO character area (top 35%) */
  characterSlot?: React.ReactNode;
  /** Slot for interview prep content (bottom 65%) */
  tableSlot?: React.ReactNode;
}

/* ── CSS custom property style type extension ──────────────────────────── */
type CSSVarStyle = React.CSSProperties & Record<`--${string}`, string | number>;

/* ── Deterministic particle config ──────────────────────────────────────── */
interface ParticleConfig {
  id: number;
  left: string;
  bottom: string;
  width: string;
  height: string;
  delay: string;
  duration: string;
  drift: string;
  opacity: number;
  color: string;
}

function generateParticles(): ParticleConfig[] {
  // Cool blue-white clinical particles — deterministic values
  const PARTICLES: ParticleConfig[] = [
    { id:  0, left:  "3%", bottom:  "0%", width: "1px", height: "1px", delay: "0s",    duration: "14s",   drift: "-12px", opacity: 0.40, color: "#4A9EDB" },
    { id:  1, left:  "9%", bottom: "22%", width: "1px", height: "1px", delay: "1.8s",  duration: "18s",   drift:  "16px", opacity: 0.28, color: "#7EC8E3" },
    { id:  2, left: "17%", bottom:  "4%", width: "2px", height: "2px", delay: "0.4s",  duration: "15s",   drift:  "10px", opacity: 0.35, color: "#4A9EDB" },
    { id:  3, left: "25%", bottom: "14%", width: "1px", height: "1px", delay: "3.2s",  duration: "12s",   drift: "-20px", opacity: 0.25, color: "#00E5FF" },
    { id:  4, left: "33%", bottom:  "0%", width: "2px", height: "2px", delay: "0s",    duration: "19s",   drift:  "22px", opacity: 0.22, color: "#4A9EDB" },
    { id:  5, left: "41%", bottom: "32%", width: "1px", height: "1px", delay: "4.1s",  duration: "16s",   drift:  "-8px", opacity: 0.30, color: "#7EC8E3" },
    { id:  6, left: "50%", bottom:  "7%", width: "1px", height: "1px", delay: "1.2s",  duration: "14.5s", drift:  "14px", opacity: 0.38, color: "#4A9EDB" },
    { id:  7, left: "58%", bottom: "18%", width: "2px", height: "2px", delay: "2.6s",  duration: "17s",   drift: "-18px", opacity: 0.28, color: "#00E5FF" },
    { id:  8, left: "66%", bottom:  "0%", width: "1px", height: "1px", delay: "0.7s",  duration: "15.5s", drift:  "12px", opacity: 0.33, color: "#4A9EDB" },
    { id:  9, left: "74%", bottom: "25%", width: "1px", height: "1px", delay: "3.8s",  duration: "13s",   drift: "-14px", opacity: 0.27, color: "#7EC8E3" },
    { id: 10, left: "82%", bottom:  "5%", width: "2px", height: "2px", delay: "1.5s",  duration: "16.5s", drift:  "20px", opacity: 0.36, color: "#4A9EDB" },
    { id: 11, left: "89%", bottom: "12%", width: "1px", height: "1px", delay: "4.5s",  duration: "12.5s", drift: "-10px", opacity: 0.24, color: "#00E5FF" },
    { id: 12, left: "95%", bottom:  "0%", width: "1px", height: "1px", delay: "0.2s",  duration: "14s",   drift:  "16px", opacity: 0.38, color: "#4A9EDB" },
    { id: 13, left: "12%", bottom: "42%", width: "1px", height: "1px", delay: "2.0s",  duration: "11s",   drift: "-22px", opacity: 0.22, color: "#7EC8E3" },
    { id: 14, left: "47%", bottom: "50%", width: "1px", height: "1px", delay: "0.9s",  duration: "13.5s", drift:  "18px", opacity: 0.30, color: "#4A9EDB" },
    { id: 15, left: "71%", bottom: "38%", width: "1px", height: "1px", delay: "5.0s",  duration: "15s",   drift: "-16px", opacity: 0.25, color: "#00E5FF" },
  ];
  return PARTICLES;
}

/* ── Teletype intel feed lines ──────────────────────────────────────────── */
const LEFT_INTEL_LINES = [
  "PREP PROTOCOL v3.2",
  "BEHAVIORAL: READY",
  "TECHNICAL: ACTIVE",
  "CASE STUDY: LOADED",
  "COMPETENCY MAP: OK",
  "BACKGROUND CHECK: ✓",
  "SECTOR: REAL ESTATE",
  "FORMAT: IN-PERSON",
  "INTERVIEWER: TBD",
  "PACKET STATUS: 67%",
  "ROUND: FIRST",
  "QUESTIONS: 24 PREP",
  "TALKING PTS: 8",
  "FOLLOW-UP: DRAFTED",
];

const RIGHT_INTEL_LINES = [
  "INTEL FEED // LIVE",
  "CBRE: NEXT 48H",
  "BLACKSTONE: WEEK 2",
  "BROOKFIELD: ACTIVE",
  "HINES: PENDING",
  "JLL: SCREENED",
  "CUSHMAN: APPLIED",
  "PROLOGIS: OFFER",
  "AVALONBAY: 1ST RD",
  "EQR: 2ND ROUND",
  "CPO NOTES: READY",
  "MARKET: BULL",
  "CAP RATE: TRENDING",
  "SECTOR BRIEF: V4",
];

/**
 * BriefingRoomScene — Floor 3 environment compositor.
 *
 * Structure:
 *   - Blueprint grid background (64px grid, cool blue, clinical)
 *   - Cool blue-white vignette lighting
 *   - Teletype scrolling text feeds on sides (interview intel)
 *   - 16 CSS-only floating particles
 *   - Top section (35% height) — CPO character area
 *   - Bottom section (65% height) — interview prep content
 *   - Bottom ticker strip — live prep stats
 */
export function BriefingRoomScene({
  stats,
  children,
  characterSlot,
  tableSlot,
}: BriefingRoomSceneProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const particles = useMemo(generateParticles, []);

  return (
    <div
      data-floor="3"
      className="floor-3-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Blueprint grid overlay ── */}
      <div className="briefing-grid" aria-hidden="true" />

      {/* ── Atmospheric overlay — cool clinical radial vignette ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 90% 70% at 50% 20%, rgba(74, 158, 219, 0.04) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(6, 10, 18, 0.65) 100%)",
        }}
      />

      {/* ── Whiteboard wall texture — top section ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "38%",
          pointerEvents: "none",
          zIndex: 1,
          background:
            "linear-gradient(to bottom, rgba(74, 158, 219, 0.025) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(74, 158, 219, 0.08)",
        }}
      />

      {/* ── Corner bracket accents ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {/* Top-left corner */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            width: "20px",
            height: "20px",
            borderTop: "1px solid rgba(0, 229, 255, 0.45)",
            borderLeft: "1px solid rgba(0, 229, 255, 0.45)",
          }}
        />
        {/* Top-right corner */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "20px",
            height: "20px",
            borderTop: "1px solid rgba(0, 229, 255, 0.45)",
            borderRight: "1px solid rgba(0, 229, 255, 0.45)",
          }}
        />
        {/* Bottom-left corner */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "8px",
            width: "20px",
            height: "20px",
            borderBottom: "1px solid rgba(0, 229, 255, 0.45)",
            borderLeft: "1px solid rgba(0, 229, 255, 0.45)",
          }}
        />
        {/* Bottom-right corner */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "8px",
            width: "20px",
            height: "20px",
            borderBottom: "1px solid rgba(0, 229, 255, 0.45)",
            borderRight: "1px solid rgba(0, 229, 255, 0.45)",
          }}
        />

        {/* Horizontal divider line at 35% */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(74, 158, 219, 0.1) 10%, rgba(74, 158, 219, 0.28) 30%, rgba(0, 229, 255, 0.38) 50%, rgba(74, 158, 219, 0.28) 70%, rgba(74, 158, 219, 0.1) 90%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Teletype scrolling intel feeds — left side ── */}
      {!reducedMotion && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: "40px",
            width: "72px",
            pointerEvents: "none",
            zIndex: 3,
            overflow: "hidden",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 15%, rgba(0,0,0,0.6) 85%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 15%, rgba(0,0,0,0.6) 85%, transparent 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "16px 8px",
              animation: `teletype-scroll 22s linear infinite`,
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              fontSize: "7px",
              color: "rgba(74, 158, 219, 0.28)",
              letterSpacing: "0.05em",
              lineHeight: 1.6,
              whiteSpace: "nowrap",
            }}
          >
            {/* Duplicate for seamless loop */}
            {[...LEFT_INTEL_LINES, ...LEFT_INTEL_LINES].map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Teletype scrolling intel feeds — right side ── */}
      {!reducedMotion && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: "40px",
            width: "72px",
            pointerEvents: "none",
            zIndex: 3,
            overflow: "hidden",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 15%, rgba(0,0,0,0.6) 85%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 15%, rgba(0,0,0,0.6) 85%, transparent 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "16px 8px",
              animation: `teletype-scroll 28s linear infinite reverse`,
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              fontSize: "7px",
              color: "rgba(74, 158, 219, 0.22)",
              letterSpacing: "0.05em",
              lineHeight: 1.6,
              whiteSpace: "nowrap",
            }}
          >
            {[...RIGHT_INTEL_LINES, ...RIGHT_INTEL_LINES].map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── CSS particles ── */}
      {!reducedMotion && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 2,
            overflow: "hidden",
          }}
        >
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: p.left,
                bottom: p.bottom,
                width: p.width,
                height: p.height,
                borderRadius: "50%",
                backgroundColor: p.color,
                opacity: p.opacity,
                "--br-drift": p.drift,
                animation: `br-particle-float ${p.duration} ease-in-out ${p.delay} infinite`,
              } as CSSVarStyle}
            />
          ))}
        </div>
      )}

      {/* ── Main content area ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top section — 35% — CPO character area */}
        <div
          style={{
            height: "35%",
            minHeight: "220px",
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          aria-label="Character area"
        >
          {characterSlot ?? (
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Placeholder podium silhouette */}
              <div
                style={{
                  width: "80px",
                  height: "120px",
                  borderRadius: "2px 2px 8px 8px",
                  background:
                    "linear-gradient(to bottom, rgba(74, 158, 219, 0.06), rgba(74, 158, 219, 0.02))",
                  border: "1px solid rgba(74, 158, 219, 0.12)",
                }}
              />
            </div>
          )}
        </div>

        {/* Divider line between character and content areas */}
        <div
          aria-hidden="true"
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(74, 158, 219, 0.08) 10%, rgba(0, 229, 255, 0.28) 50%, rgba(74, 158, 219, 0.08) 90%, transparent 100%)",
            flexShrink: 0,
          }}
        />

        {/* Bottom section — 65% — Interview prep content */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "auto",
          }}
          aria-label="Interview preparation area"
        >
          {tableSlot ?? children}
        </div>
      </div>

      {/* ── Bottom ticker strip ── */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <BriefingRoomTicker stats={stats} />
      </div>

      {/* Teletype keyframes */}
      <style>{`
        @keyframes teletype-scroll {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
