"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import "@/styles/floor-5.css";
import { WritingRoomTicker } from "./WritingRoomTicker";
import type { WritingRoomStats } from "./WritingRoomTicker";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type { WritingRoomStats };

interface WritingRoomSceneProps {
  stats: WritingRoomStats;
  children?: React.ReactNode;
  /** Slot for CMO character area (right ~40%) */
  characterSlot?: React.ReactNode;
  /** Slot for document list + editor (left ~60%) */
  editorSlot?: React.ReactNode;
}

/* ── CSS custom property style type extension ──────────────────────────── */
type CSSVarStyle = React.CSSProperties & Record<`--${string}`, string | number>;

/* ── Deterministic dust particle config ─────────────────────────────────── */
interface DustParticleConfig {
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

function generateDustParticles(): DustParticleConfig[] {
  // Deterministic pseudo-random seeded values — warm amber/gold dust motes
  const PARTICLES: DustParticleConfig[] = [
    { id:  0, left:  "3%",  bottom:  "0%",  width: "2px", height: "2px", delay: "0s",    duration: "13s",   drift:  "15px", opacity: 0.40, color: "#C9A84C" },
    { id:  1, left:  "9%",  bottom: "25%",  width: "1px", height: "1px", delay: "1.4s",  duration: "16s",   drift: "-18px", opacity: 0.30, color: "#E8A020" },
    { id:  2, left: "16%",  bottom:  "5%",  width: "2px", height: "2px", delay: "0.6s",  duration: "14.5s", drift:  "12px", opacity: 0.38, color: "#C9A84C" },
    { id:  3, left: "24%",  bottom: "15%",  width: "1px", height: "1px", delay: "3.0s",  duration: "11s",   drift: "-22px", opacity: 0.28, color: "#F5C842" },
    { id:  4, left: "32%",  bottom:  "0%",  width: "3px", height: "3px", delay: "0s",    duration: "18s",   drift:  "25px", opacity: 0.22, color: "#C9A84C" },
    { id:  5, left: "41%",  bottom: "35%",  width: "1px", height: "1px", delay: "3.8s",  duration: "15s",   drift: "-10px", opacity: 0.34, color: "#E8A020" },
    { id:  6, left: "50%",  bottom: "10%",  width: "2px", height: "2px", delay: "1.9s",  duration: "12.5s", drift:  "18px", opacity: 0.42, color: "#C9A84C" },
    { id:  7, left: "58%",  bottom: "20%",  width: "1px", height: "1px", delay: "4.5s",  duration: "17s",   drift: "-20px", opacity: 0.28, color: "#F5C842" },
    { id:  8, left: "65%",  bottom:  "0%",  width: "2px", height: "2px", delay: "1.1s",  duration: "13.5s", drift:  "14px", opacity: 0.38, color: "#C9A84C" },
    { id:  9, left: "72%",  bottom: "28%",  width: "1px", height: "1px", delay: "2.7s",  duration: "16.5s", drift: "-16px", opacity: 0.32, color: "#E8A020" },
    { id: 10, left: "79%",  bottom:  "4%",  width: "2px", height: "2px", delay: "0.8s",  duration: "12s",   drift:  "22px", opacity: 0.36, color: "#C9A84C" },
    { id: 11, left: "86%",  bottom: "12%",  width: "1px", height: "1px", delay: "4.2s",  duration: "15s",   drift: "-14px", opacity: 0.26, color: "#F5C842" },
    { id: 12, left: "92%",  bottom:  "0%",  width: "2px", height: "2px", delay: "0.4s",  duration: "11.5s", drift:  "18px", opacity: 0.40, color: "#C9A84C" },
    { id: 13, left: "96%",  bottom: "22%",  width: "1px", height: "1px", delay: "5.2s",  duration: "18s",   drift: "-25px", opacity: 0.24, color: "#E8A020" },
    { id: 14, left:  "6%",  bottom: "45%",  width: "2px", height: "2px", delay: "2.3s",  duration: "13.5s", drift:  "16px", opacity: 0.34, color: "#C9A84C" },
    { id: 15, left: "21%",  bottom: "60%",  width: "1px", height: "1px", delay: "0.9s",  duration: "12s",   drift: "-12px", opacity: 0.28, color: "#F5C842" },
    { id: 16, left: "44%",  bottom: "50%",  width: "2px", height: "2px", delay: "3.5s",  duration: "15.5s", drift:  "20px", opacity: 0.32, color: "#C9A84C" },
    { id: 17, left: "62%",  bottom: "65%",  width: "1px", height: "1px", delay: "1.7s",  duration: "11s",   drift: "-18px", opacity: 0.30, color: "#E8A020" },
    { id: 18, left: "77%",  bottom: "40%",  width: "2px", height: "2px", delay: "4.8s",  duration: "17s",   drift:  "14px", opacity: 0.38, color: "#C9A84C" },
    { id: 19, left: "90%",  bottom: "55%",  width: "1px", height: "1px", delay: "0s",    duration: "14s",   drift: "-20px", opacity: 0.26, color: "#F5C842" },
  ];
  return PARTICLES;
}

/**
 * WritingRoomScene — Floor 5 environment compositor.
 *
 * Structure:
 *   - Warm wood/paper background (CSS gradients, no images)
 *   - Ruled-line texture overlay (literary feel)
 *   - Left margin rule (classic notebook detail)
 *   - 20 CSS-only amber dust motes
 *   - Soft warm vignette
 *   - Left section (60% width) — document editor area
 *   - Right section (40% width) — CMO character at desk
 *   - Bottom ticker strip — live document stats
 */
export function WritingRoomScene({
  stats,
  children,
  characterSlot,
  editorSlot,
}: WritingRoomSceneProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const particles = useMemo(generateDustParticles, []);

  return (
    <div
      data-floor="5"
      className="floor-5-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Ruled-line texture overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(201, 168, 76, 0.035) 31px, rgba(201, 168, 76, 0.035) 32px)",
          backgroundSize: "100% 32px",
        }}
      />

      {/* ── Left margin rule — classic notebook detail ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "8%",
          width: "1px",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(180, 60, 60, 0.06) 12%, rgba(180, 60, 60, 0.05) 88%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── Warm vignette overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 80% 65% at 50% 35%, transparent 35%, rgba(20, 10, 4, 0.60) 100%)",
        }}
      />

      {/* ── Warm corner accent lines ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {/* Horizontal divider hint */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(201, 168, 76, 0.08) 15%, rgba(201, 168, 76, 0.18) 35%, rgba(232, 160, 32, 0.22) 50%, rgba(201, 168, 76, 0.18) 65%, rgba(201, 168, 76, 0.08) 85%, transparent 100%)",
          }}
        />
        {/* Corner accent — top left */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            width: "20px",
            height: "20px",
            borderTop: "1px solid rgba(201, 168, 76, 0.35)",
            borderLeft: "1px solid rgba(201, 168, 76, 0.35)",
          }}
        />
        {/* Corner accent — top right */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "20px",
            height: "20px",
            borderTop: "1px solid rgba(201, 168, 76, 0.35)",
            borderRight: "1px solid rgba(201, 168, 76, 0.35)",
          }}
        />
        {/* Corner accent — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "8px",
            width: "20px",
            height: "20px",
            borderBottom: "1px solid rgba(201, 168, 76, 0.35)",
            borderLeft: "1px solid rgba(201, 168, 76, 0.35)",
          }}
        />
        {/* Corner accent — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "8px",
            width: "20px",
            height: "20px",
            borderBottom: "1px solid rgba(201, 168, 76, 0.35)",
            borderRight: "1px solid rgba(201, 168, 76, 0.35)",
          }}
        />
      </div>

      {/* ── Warm desk lamp glow (top right corner) ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "35%",
          height: "45%",
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 80% 70% at 90% 0%, rgba(232, 160, 32, 0.05) 0%, transparent 65%)",
        }}
      />

      {/* ── CSS dust motes ── */}
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
                "--wr-drift": p.drift,
                animation: `wr-dust-float ${p.duration} ease-in-out ${p.delay} infinite`,
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
          flexDirection: "row",
          minHeight: 0,
        }}
      >
        {/* Left section — 60% — Document editor area */}
        <div
          style={{
            flex: "0 0 60%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(201, 168, 76, 0.1)",
          }}
          aria-label="Document editor area"
        >
          {editorSlot ?? children}
        </div>

        {/* Warm divider glow */}
        <div
          aria-hidden="true"
          style={{
            width: "1px",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(201, 168, 76, 0.08) 15%, rgba(201, 168, 76, 0.18) 50%, rgba(201, 168, 76, 0.08) 85%, transparent 100%)",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* Right section — 40% — CMO character area */}
        <div
          style={{
            flex: "0 0 40%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
          aria-label="CMO character area"
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
                    "linear-gradient(to bottom, rgba(201, 168, 76, 0.08), rgba(201, 168, 76, 0.03))",
                  border: "1px solid rgba(201, 168, 76, 0.15)",
                }}
              />
            </div>
          )}
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
        <WritingRoomTicker stats={stats} />
      </div>
    </div>
  );
}
