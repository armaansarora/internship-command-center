"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import "@/styles/floor-7.css";
import { WarRoomTicker } from "./WarRoomTicker";
import type { WarRoomStats } from "./WarRoomTicker";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type { WarRoomStats };

interface WarRoomSceneProps {
  stats: WarRoomStats;
  children?: React.ReactNode;
  /** Slot for CRO character area (top 35%) */
  characterSlot?: React.ReactNode;
  /** Slot for war table content (bottom 65%) */
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
  const PARTICLES: ParticleConfig[] = [
    { id:  0, left:  "4%", bottom:  "0%", width: "2px", height: "2px", delay: "0s",    duration: "11s",  drift: "-18px", opacity: 0.55, color: "#1E90FF" },
    { id:  1, left: "10%", bottom: "20%", width: "1px", height: "1px", delay: "1.2s",  duration: "14s",  drift:  "22px", opacity: 0.40, color: "#00D4FF" },
    { id:  2, left: "18%", bottom:  "5%", width: "2px", height: "2px", delay: "0.5s",  duration: "12.5s",drift:  "14px", opacity: 0.50, color: "#1E90FF" },
    { id:  3, left: "27%", bottom: "12%", width: "1px", height: "1px", delay: "2.8s",  duration: "10s",  drift: "-26px", opacity: 0.35, color: "#00D4FF" },
    { id:  4, left: "34%", bottom:  "0%", width: "3px", height: "3px", delay: "0s",    duration: "16s",  drift:  "30px", opacity: 0.30, color: "#1E90FF" },
    { id:  5, left: "42%", bottom: "30%", width: "1px", height: "1px", delay: "3.5s",  duration: "13s",  drift: "-12px", opacity: 0.45, color: "#00D4FF" },
    { id:  6, left: "51%", bottom:  "8%", width: "2px", height: "2px", delay: "1.7s",  duration: "11.5s",drift:  "20px", opacity: 0.55, color: "#1E90FF" },
    { id:  7, left: "59%", bottom: "15%", width: "1px", height: "1px", delay: "4.1s",  duration: "15s",  drift: "-24px", opacity: 0.38, color: "#00FF87" },
    { id:  8, left: "66%", bottom:  "0%", width: "2px", height: "2px", delay: "0.9s",  duration: "12s",  drift:  "16px", opacity: 0.50, color: "#1E90FF" },
    { id:  9, left: "73%", bottom: "22%", width: "1px", height: "1px", delay: "2.3s",  duration: "14.5s",drift: "-20px", opacity: 0.42, color: "#00D4FF" },
    { id: 10, left: "80%", bottom:  "4%", width: "2px", height: "2px", delay: "1.0s",  duration: "11s",  drift:  "28px", opacity: 0.48, color: "#1E90FF" },
    { id: 11, left: "87%", bottom: "10%", width: "1px", height: "1px", delay: "3.8s",  duration: "13.5s",drift: "-16px", opacity: 0.36, color: "#00D4FF" },
    { id: 12, left: "93%", bottom:  "0%", width: "2px", height: "2px", delay: "0.3s",  duration: "10.5s",drift:  "22px", opacity: 0.52, color: "#1E90FF" },
    { id: 13, left: "97%", bottom: "18%", width: "1px", height: "1px", delay: "5.0s",  duration: "16.5s",drift: "-30px", opacity: 0.33, color: "#00D4FF" },
    { id: 14, left:  "7%", bottom: "40%", width: "2px", height: "2px", delay: "2.1s",  duration: "12s",  drift:  "18px", opacity: 0.46, color: "#1E90FF" },
    { id: 15, left: "22%", bottom: "55%", width: "1px", height: "1px", delay: "0.7s",  duration: "11s",  drift: "-14px", opacity: 0.38, color: "#00D4FF" },
    { id: 16, left: "45%", bottom: "45%", width: "2px", height: "2px", delay: "3.2s",  duration: "14s",  drift:  "24px", opacity: 0.44, color: "#1E90FF" },
    { id: 17, left: "63%", bottom: "60%", width: "1px", height: "1px", delay: "1.5s",  duration: "10s",  drift: "-20px", opacity: 0.40, color: "#00FF87" },
    { id: 18, left: "78%", bottom: "35%", width: "2px", height: "2px", delay: "4.4s",  duration: "15.5s",drift:  "16px", opacity: 0.50, color: "#1E90FF" },
    { id: 19, left: "91%", bottom: "48%", width: "1px", height: "1px", delay: "0s",    duration: "12.5s",drift: "-22px", opacity: 0.35, color: "#00D4FF" },
  ];
  return PARTICLES;
}

/**
 * WarRoomScene — Floor 7 environment compositor.
 *
 * Structure:
 *   - Blueprint grid background (CSS, no images)
 *   - 20 CSS-only floating particles
 *   - Top section (35% height) — CRO character area
 *   - Bottom section (65% height) — War table content
 *   - Bottom ticker strip — live pipeline stats
 */
export function WarRoomScene({
  stats,
  children,
  characterSlot,
  tableSlot,
}: WarRoomSceneProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const particles = useMemo(() => generateParticles(), []);

  return (
    <div
      data-floor="7"
      className="war-room-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric overlay — radial vignette ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, transparent 40%, rgba(6, 11, 20, 0.55) 100%)",
        }}
      />

      {/* ── Blueprint accent lines — horizontal horizon ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(30, 144, 255, 0.12) 15%, rgba(30, 144, 255, 0.28) 35%, rgba(0, 212, 255, 0.35) 50%, rgba(30, 144, 255, 0.28) 65%, rgba(30, 144, 255, 0.12) 85%, transparent 100%)",
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
            borderTop: "1px solid rgba(0, 212, 255, 0.4)",
            borderLeft: "1px solid rgba(0, 212, 255, 0.4)",
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
            borderTop: "1px solid rgba(0, 212, 255, 0.4)",
            borderRight: "1px solid rgba(0, 212, 255, 0.4)",
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
            borderBottom: "1px solid rgba(0, 212, 255, 0.4)",
            borderLeft: "1px solid rgba(0, 212, 255, 0.4)",
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
            borderBottom: "1px solid rgba(0, 212, 255, 0.4)",
            borderRight: "1px solid rgba(0, 212, 255, 0.4)",
          }}
        />
      </div>

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
                "--wm-drift": p.drift,
                animation: `wm-particle-float ${p.duration} ease-in-out ${p.delay} infinite`,
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
        {/* Top section — 35% — CRO character area */}
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
                    "linear-gradient(to bottom, rgba(30, 144, 255, 0.08), rgba(30, 144, 255, 0.04))",
                  border: "1px solid rgba(30, 144, 255, 0.15)",
                }}
              />
            </div>
          )}
        </div>

        {/* Divider line between character and table areas */}
        <div
          aria-hidden="true"
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(30, 144, 255, 0.1) 10%, rgba(0, 212, 255, 0.3) 50%, rgba(30, 144, 255, 0.1) 90%, transparent 100%)",
            flexShrink: 0,
          }}
        />

        {/* Bottom section — 65% — War table content */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "auto",
          }}
          aria-label="War table"
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
        <WarRoomTicker stats={stats} />
      </div>
    </div>
  );
}
