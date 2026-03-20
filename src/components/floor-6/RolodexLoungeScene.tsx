"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import "@/styles/floor-6.css";
import { RolodexLoungeTicker } from "./RolodexLoungeTicker";
import type { RolodexLoungeStats } from "./RolodexLoungeTicker";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type { RolodexLoungeStats };

interface RolodexLoungeSceneProps {
  stats: RolodexLoungeStats;
  children?: React.ReactNode;
  /** Slot for CNO character area (top 35%) */
  characterSlot?: React.ReactNode;
  /** Slot for contact grid content (bottom 65%) */
  tableSlot?: React.ReactNode;
}

/* ── CSS custom property style type extension ──────────────────────────── */
type CSSVarStyle = React.CSSProperties & Record<`--${string}`, string | number>;

/* ── Deterministic ember/dust particle config ───────────────────────────── */
interface EmberConfig {
  id: number;
  left: string;
  bottom: string;
  size: string;
  delay: string;
  duration: string;
  drift: string;
  opacity: number;
  color: string;
}

function generateEmbers(): EmberConfig[] {
  const EMBERS: EmberConfig[] = [
    { id:  0, left:  "3%", bottom:  "0%", size: "2px", delay: "0s",    duration: "13s",  drift: "-12px", opacity: 0.45, color: "#C9A84C" },
    { id:  1, left:  "9%", bottom: "15%", size: "1px", delay: "1.5s",  duration: "16s",  drift:  "18px", opacity: 0.35, color: "#E8C87A" },
    { id:  2, left: "17%", bottom:  "5%", size: "2px", delay: "0.7s",  duration: "11s",  drift:  "10px", opacity: 0.40, color: "#C9A84C" },
    { id:  3, left: "25%", bottom: "10%", size: "1px", delay: "2.8s",  duration: "14s",  drift: "-20px", opacity: 0.30, color: "#D97706" },
    { id:  4, left: "33%", bottom:  "0%", size: "2px", delay: "0s",    duration: "18s",  drift:  "24px", opacity: 0.28, color: "#C9A84C" },
    { id:  5, left: "41%", bottom: "25%", size: "1px", delay: "3.4s",  duration: "12s",  drift: "-14px", opacity: 0.38, color: "#E8C87A" },
    { id:  6, left: "50%", bottom:  "8%", size: "2px", delay: "1.6s",  duration: "10.5s",drift:  "16px", opacity: 0.44, color: "#C9A84C" },
    { id:  7, left: "58%", bottom: "18%", size: "1px", delay: "4.2s",  duration: "15s",  drift: "-22px", opacity: 0.32, color: "#F59E0B" },
    { id:  8, left: "66%", bottom:  "0%", size: "2px", delay: "0.9s",  duration: "13.5s",drift:  "14px", opacity: 0.42, color: "#C9A84C" },
    { id:  9, left: "74%", bottom: "20%", size: "1px", delay: "2.1s",  duration: "11.5s",drift: "-18px", opacity: 0.36, color: "#D97706" },
    { id: 10, left: "81%", bottom:  "4%", size: "2px", delay: "1.1s",  duration: "14s",  drift:  "20px", opacity: 0.40, color: "#C9A84C" },
    { id: 11, left: "88%", bottom: "12%", size: "1px", delay: "3.7s",  duration: "12.5s",drift: "-16px", opacity: 0.30, color: "#E8C87A" },
    { id: 12, left: "94%", bottom:  "0%", size: "2px", delay: "0.4s",  duration: "10s",  drift:  "22px", opacity: 0.46, color: "#C9A84C" },
    { id: 13, left: "98%", bottom: "22%", size: "1px", delay: "5.0s",  duration: "17s",  drift: "-26px", opacity: 0.28, color: "#D97706" },
    { id: 14, left:  "6%", bottom: "38%", size: "2px", delay: "2.3s",  duration: "11s",  drift:  "14px", opacity: 0.38, color: "#C9A84C" },
    { id: 15, left: "20%", bottom: "52%", size: "1px", delay: "0.6s",  duration: "13s",  drift: "-12px", opacity: 0.32, color: "#E8C87A" },
    { id: 16, left: "44%", bottom: "44%", size: "2px", delay: "3.1s",  duration: "15.5s",drift:  "18px", opacity: 0.36, color: "#C9A84C" },
    { id: 17, left: "62%", bottom: "58%", size: "1px", delay: "1.4s",  duration: "10s",  drift: "-16px", opacity: 0.33, color: "#F59E0B" },
    { id: 18, left: "79%", bottom: "33%", size: "2px", delay: "4.5s",  duration: "14.5s",drift:  "12px", opacity: 0.42, color: "#C9A84C" },
    { id: 19, left: "92%", bottom: "46%", size: "1px", delay: "0s",    duration: "12s",  drift: "-20px", opacity: 0.29, color: "#D97706" },
  ];
  return EMBERS;
}

/**
 * RolodexLoungeScene — Floor 6 environment compositor.
 *
 * Structure:
 *   - Warm wood-grain lounge background (CSS, no images)
 *   - 20 CSS-only floating ember/dust particles
 *   - Top section (35% height) — CNO character area
 *   - Bottom section (65% height) — Contact grid
 *   - Bottom ticker strip — live network stats
 */
export function RolodexLoungeScene({
  stats,
  children,
  characterSlot,
  tableSlot,
}: RolodexLoungeSceneProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const embers = useMemo(generateEmbers, []);

  return (
    <div
      data-floor="6"
      className="rolodex-lounge-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric overlay — warm radial vignette ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, transparent 40%, rgba(26, 10, 3, 0.6) 100%)",
        }}
      />

      {/* ── Warm amber ceiling glow — lounge lamp effect ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "200px",
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(201, 168, 76, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* ── Window light — floor 6 height ambient ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "10%",
          right: "5%",
          width: "160px",
          height: "200px",
          pointerEvents: "none",
          zIndex: 1,
          background:
            "linear-gradient(135deg, rgba(255, 200, 120, 0.07) 0%, rgba(255, 180, 80, 0.04) 50%, transparent 100%)",
          borderLeft: "1px solid rgba(201, 168, 76, 0.06)",
          borderBottom: "1px solid rgba(201, 168, 76, 0.04)",
        }}
      />

      {/* ── Lounge accent lines ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {/* Horizon line */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(201, 168, 76, 0.1) 15%, rgba(201, 168, 76, 0.22) 35%, rgba(232, 200, 122, 0.28) 50%, rgba(201, 168, 76, 0.22) 65%, rgba(201, 168, 76, 0.1) 85%, transparent 100%)",
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

      {/* ── Ember / dust particles ── */}
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
          {embers.map((e) => (
            <div
              key={e.id}
              style={{
                position: "absolute",
                left: e.left,
                bottom: e.bottom,
                width: e.size,
                height: e.size,
                borderRadius: "50%",
                backgroundColor: e.color,
                opacity: e.opacity,
                "--rl-drift": e.drift,
                "--rl-ember-opacity": e.opacity,
                animation: `rl-ember-rise ${e.duration} ease-in-out ${e.delay} infinite`,
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
        {/* Top section — 35% — CNO character area */}
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
                    "linear-gradient(to bottom, rgba(201, 168, 76, 0.08), rgba(201, 168, 76, 0.04))",
                  border: "1px solid rgba(201, 168, 76, 0.15)",
                }}
              />
            </div>
          )}
        </div>

        {/* Desk divider line */}
        <div
          aria-hidden="true"
          className="rolodex-desk-line"
          style={{ flexShrink: 0 }}
        />

        {/* Bottom section — 65% — Contact grid */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "auto",
          }}
          aria-label="Contact lounge"
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
        <RolodexLoungeTicker stats={stats} />
      </div>
    </div>
  );
}
