"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import "@/styles/floor-4.css";
import { SituationRoomTicker } from "./SituationRoomTicker";
import type { SituationRoomStats } from "./SituationRoomTicker";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type { SituationRoomStats };

interface SituationRoomSceneProps {
  stats: SituationRoomStats;
  children?: React.ReactNode;
  /** Slot for COO character area (top 35%) */
  characterSlot?: React.ReactNode;
  /** Slot for deadline/content area (bottom 65%) */
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
  // Deterministic pseudo-random seeded values — no Math.random() on render
  // Amber #DC7C28 and red-orange tones
  const PARTICLES: ParticleConfig[] = [
    { id:  0, left:  "4%", bottom:  "0%", width: "2px", height: "2px", delay: "0s",    duration: "11s",   drift: "-18px", opacity: 0.55, color: "#DC7C28" },
    { id:  1, left: "10%", bottom: "20%", width: "1px", height: "1px", delay: "1.2s",  duration: "14s",   drift:  "22px", opacity: 0.40, color: "#F0A050" },
    { id:  2, left: "18%", bottom:  "5%", width: "2px", height: "2px", delay: "0.5s",  duration: "12.5s", drift:  "14px", opacity: 0.50, color: "#DC7C28" },
    { id:  3, left: "27%", bottom: "12%", width: "1px", height: "1px", delay: "2.8s",  duration: "10s",   drift: "-26px", opacity: 0.35, color: "#FF8C42" },
    { id:  4, left: "34%", bottom:  "0%", width: "3px", height: "3px", delay: "0s",    duration: "16s",   drift:  "30px", opacity: 0.28, color: "#DC7C28" },
    { id:  5, left: "42%", bottom: "30%", width: "1px", height: "1px", delay: "3.5s",  duration: "13s",   drift: "-12px", opacity: 0.45, color: "#F0A050" },
    { id:  6, left: "51%", bottom:  "8%", width: "2px", height: "2px", delay: "1.7s",  duration: "11.5s", drift:  "20px", opacity: 0.55, color: "#DC7C28" },
    { id:  7, left: "59%", bottom: "15%", width: "1px", height: "1px", delay: "4.1s",  duration: "15s",   drift: "-24px", opacity: 0.38, color: "#E84040" },
    { id:  8, left: "66%", bottom:  "0%", width: "2px", height: "2px", delay: "0.9s",  duration: "12s",   drift:  "16px", opacity: 0.50, color: "#DC7C28" },
    { id:  9, left: "73%", bottom: "22%", width: "1px", height: "1px", delay: "2.3s",  duration: "14.5s", drift: "-20px", opacity: 0.42, color: "#F0A050" },
    { id: 10, left: "80%", bottom:  "4%", width: "2px", height: "2px", delay: "1.0s",  duration: "11s",   drift:  "28px", opacity: 0.48, color: "#DC7C28" },
    { id: 11, left: "87%", bottom: "10%", width: "1px", height: "1px", delay: "3.8s",  duration: "13.5s", drift: "-16px", opacity: 0.36, color: "#FF8C42" },
    { id: 12, left: "93%", bottom:  "0%", width: "2px", height: "2px", delay: "0.3s",  duration: "10.5s", drift:  "22px", opacity: 0.52, color: "#DC7C28" },
    { id: 13, left: "97%", bottom: "18%", width: "1px", height: "1px", delay: "5.0s",  duration: "16.5s", drift: "-30px", opacity: 0.32, color: "#F0A050" },
    { id: 14, left:  "7%", bottom: "40%", width: "2px", height: "2px", delay: "2.1s",  duration: "12s",   drift:  "18px", opacity: 0.46, color: "#DC7C28" },
    { id: 15, left: "22%", bottom: "55%", width: "1px", height: "1px", delay: "0.7s",  duration: "11s",   drift: "-14px", opacity: 0.38, color: "#E84040" },
    { id: 16, left: "45%", bottom: "45%", width: "2px", height: "2px", delay: "3.2s",  duration: "14s",   drift:  "24px", opacity: 0.44, color: "#DC7C28" },
    { id: 17, left: "63%", bottom: "60%", width: "1px", height: "1px", delay: "1.5s",  duration: "10s",   drift: "-20px", opacity: 0.40, color: "#FF8C42" },
    { id: 18, left: "78%", bottom: "35%", width: "2px", height: "2px", delay: "4.4s",  duration: "15.5s", drift:  "16px", opacity: 0.50, color: "#DC7C28" },
    { id: 19, left: "91%", bottom: "48%", width: "1px", height: "1px", delay: "0s",    duration: "12.5s", drift: "-22px", opacity: 0.34, color: "#F0A050" },
  ];
  return PARTICLES;
}

/**
 * SituationRoomScene — Floor 4 environment compositor.
 *
 * Structure:
 *   - Blueprint grid background (CSS, amber tones)
 *   - Alert pulse rings and radar sweep atmosphere
 *   - 20 CSS-only floating amber/red-orange particles
 *   - Top section (35% height) — COO character area
 *   - Bottom section (65% height) — Deadline / content area
 *   - Bottom ticker strip — urgency stats
 */
export function SituationRoomScene({
  stats,
  children,
  characterSlot,
  tableSlot,
}: SituationRoomSceneProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const particles = useMemo(() => generateParticles(), []);

  return (
    <div
      data-floor="4"
      className="situation-room-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric overlay — warm amber radial vignette ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, transparent 40%, rgba(10, 8, 0, 0.60) 100%)",
        }}
      />

      {/* ── Alert pulse rings — urgency atmosphere ── */}
      {!reducedMotion && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {([1, 2, 3] as const).map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: `${i * 80}px`,
                borderRadius: "50%",
                border: `1px solid rgba(220, 120, 40, ${0.05 - i * 0.01})`,
                animation: `ping ${1.5 + i * 0.4}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Subtle horizontal scan lines — SCIF atmosphere ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(220, 100, 40, 0.014) 3px, rgba(220, 100, 40, 0.014) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* ── Radar sweep ── */}
      {!reducedMotion && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "17%",
            right: "8%",
            transform: "translate(0, 0)",
            width: "200px",
            height: "200px",
            opacity: 0.1,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* Outer ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1px solid rgba(220, 120, 40, 0.6)",
            }}
          />
          {/* Inner ring */}
          <div
            style={{
              position: "absolute",
              inset: "40px",
              borderRadius: "50%",
              border: "1px solid rgba(220, 120, 40, 0.4)",
            }}
          />
          {/* Center dot */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "rgba(220, 120, 40, 0.8)",
            }}
          />
          {/* Sweep arm */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              overflow: "hidden",
              animation: "radar-sweep 3s linear infinite",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "50%",
                height: "2px",
                transformOrigin: "0% 50%",
                background:
                  "linear-gradient(to right, rgba(220, 120, 40, 0.9), rgba(220, 120, 40, 0))",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                width: "50%",
                height: "100%",
                transformOrigin: "0% 50%",
                background:
                  "conic-gradient(from -30deg at 0% 50%, rgba(220, 120, 40, 0.15), rgba(220, 120, 40, 0) 30deg)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Blueprint accent lines ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {/* Divider line at top 35% */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(220, 124, 40, 0.10) 15%, rgba(220, 124, 40, 0.26) 35%, rgba(240, 160, 80, 0.32) 50%, rgba(220, 124, 40, 0.26) 65%, rgba(220, 124, 40, 0.10) 85%, transparent 100%)",
          }}
        />
        {/* Corner accent — top left */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            width: "24px",
            height: "24px",
            borderTop: "1px solid rgba(240, 160, 80, 0.4)",
            borderLeft: "1px solid rgba(240, 160, 80, 0.4)",
          }}
        />
        {/* Corner accent — top right */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "24px",
            height: "24px",
            borderTop: "1px solid rgba(240, 160, 80, 0.4)",
            borderRight: "1px solid rgba(240, 160, 80, 0.4)",
          }}
        />
        {/* Corner accent — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "8px",
            width: "24px",
            height: "24px",
            borderBottom: "1px solid rgba(240, 160, 80, 0.4)",
            borderLeft: "1px solid rgba(240, 160, 80, 0.4)",
          }}
        />
        {/* Corner accent — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "8px",
            width: "24px",
            height: "24px",
            borderBottom: "1px solid rgba(240, 160, 80, 0.4)",
            borderRight: "1px solid rgba(240, 160, 80, 0.4)",
          }}
        />
      </div>

      {/* ── CSS particles — amber/red-orange ── */}
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
                "--sr-drift": p.drift,
                animation: `sr-particle-float ${p.duration} ease-in-out ${p.delay} infinite`,
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
        {/* Top section — 35% — COO character area */}
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
              {/* Placeholder silhouette */}
              <div
                style={{
                  width: "80px",
                  height: "120px",
                  borderRadius: "40px 40px 8px 8px",
                  background:
                    "linear-gradient(to bottom, rgba(220, 124, 40, 0.08), rgba(220, 124, 40, 0.04))",
                  border: "1px solid rgba(220, 124, 40, 0.15)",
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
              "linear-gradient(to right, transparent 0%, rgba(220, 124, 40, 0.10) 10%, rgba(240, 160, 80, 0.28) 50%, rgba(220, 124, 40, 0.10) 90%, transparent 100%)",
            flexShrink: 0,
          }}
        />

        {/* Bottom section — 65% — Deadline / content area */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "auto",
          }}
          aria-label="Situation room content"
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
        <SituationRoomTicker stats={stats} />
      </div>
    </div>
  );
}
