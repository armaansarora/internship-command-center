"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import "@/styles/floor-2.css";
import { ObservatoryTicker } from "./ObservatoryTicker";
import type { ObservatoryStats } from "./ObservatoryTicker";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type { ObservatoryStats };

interface ObservatorySceneProps {
  stats: ObservatoryStats;
  /** Slot for CFO character area (left panel) */
  characterSlot?: React.ReactNode;
  /** Slot for analytics dashboard (right panel) */
  dashboardSlot?: React.ReactNode;
}

type CSSVarStyle = React.CSSProperties & Record<`--${string}`, string | number>;

interface ParticleConfig {
  id: number;
  left: string;
  top: string;
  width: string;
  height: string;
  delay: string;
  duration: string;
  opacity: number;
  color: string;
}

function generateParticles(): ParticleConfig[] {
  return [
    { id: 0,  left: "5%",  top: "15%", width: "2px", height: "2px", delay: "0s",    duration: "8s",   opacity: 0.6, color: "#3C8CDC" },
    { id: 1,  left: "15%", top: "45%", width: "1px", height: "1px", delay: "1.5s",  duration: "11s",  opacity: 0.4, color: "#64B4FF" },
    { id: 2,  left: "25%", top: "20%", width: "2px", height: "2px", delay: "0.8s",  duration: "9.5s", opacity: 0.5, color: "#00D4FF" },
    { id: 3,  left: "35%", top: "60%", width: "1px", height: "1px", delay: "2.2s",  duration: "12s",  opacity: 0.35, color: "#3C8CDC" },
    { id: 4,  left: "50%", top: "10%", width: "3px", height: "3px", delay: "0s",    duration: "14s",  opacity: 0.3, color: "#64B4FF" },
    { id: 5,  left: "60%", top: "70%", width: "1px", height: "1px", delay: "3.1s",  duration: "10s",  opacity: 0.45, color: "#00D4FF" },
    { id: 6,  left: "70%", top: "30%", width: "2px", height: "2px", delay: "1.1s",  duration: "8.5s", opacity: 0.55, color: "#3C8CDC" },
    { id: 7,  left: "80%", top: "50%", width: "1px", height: "1px", delay: "4.0s",  duration: "13s",  opacity: 0.38, color: "#64B4FF" },
    { id: 8,  left: "88%", top: "25%", width: "2px", height: "2px", delay: "0.5s",  duration: "9s",   opacity: 0.5, color: "#00D4FF" },
    { id: 9,  left: "92%", top: "65%", width: "1px", height: "1px", delay: "2.8s",  duration: "11.5s",opacity: 0.4, color: "#3C8CDC" },
    { id: 10, left: "12%", top: "75%", width: "2px", height: "2px", delay: "1.9s",  duration: "10.5s",opacity: 0.48, color: "#64B4FF" },
    { id: 11, left: "43%", top: "85%", width: "1px", height: "1px", delay: "3.5s",  duration: "7.5s", opacity: 0.35, color: "#00D4FF" },
  ];
}

/**
 * ObservatoryScene — Floor 2 environment compositor.
 * Cool blue panoramic observatory feel.
 */
export function ObservatoryScene({ stats, characterSlot, dashboardSlot }: ObservatorySceneProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const particles = useMemo(() => generateParticles(), []);

  return (
    <div
      data-floor="2"
      className="observatory-bg"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 70% 50% at 50% 25%, transparent 35%, rgba(5, 11, 18, 0.6) 100%)",
        }}
      />

      {/* ── Panoramic window hint — top accent ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background:
            "linear-gradient(to right, transparent, rgba(60, 140, 220, 0.1) 15%, rgba(60, 140, 220, 0.3) 35%, rgba(100, 180, 255, 0.4) 50%, rgba(60, 140, 220, 0.3) 65%, rgba(60, 140, 220, 0.1) 85%, transparent)",
          zIndex: 2,
        }}
      />

      {/* ── Sweep radar (atmospheric) ── */}
      {!reducedMotion && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "35%",
            left: "20%",
            width: "320px",
            height: "320px",
            marginTop: "-160px",
            marginLeft: "-160px",
            zIndex: 1,
            pointerEvents: "none",
            opacity: 0.15,
          }}
        >
          <div className="obs-sweep" style={{ width: "100%", height: "100%" }} />
          {/* Concentric rings */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: `${i * 50}px`,
                borderRadius: "50%",
                border: `1px solid rgba(60, 140, 220, ${0.12 - i * 0.03})`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Corner accents ── */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
        {[
          { top: "8px",    left: "8px",   borderTop: "1px solid rgba(100, 180, 255, 0.35)", borderLeft: "1px solid rgba(100, 180, 255, 0.35)" },
          { top: "8px",    right: "8px",  borderTop: "1px solid rgba(100, 180, 255, 0.35)", borderRight: "1px solid rgba(100, 180, 255, 0.35)" },
          { bottom: "40px", left: "8px",  borderBottom: "1px solid rgba(100, 180, 255, 0.35)", borderLeft: "1px solid rgba(100, 180, 255, 0.35)" },
          { bottom: "40px", right: "8px", borderBottom: "1px solid rgba(100, 180, 255, 0.35)", borderRight: "1px solid rgba(100, 180, 255, 0.35)" },
        ].map((style, i) => (
          <div key={i} style={{ position: "absolute", width: "20px", height: "20px", ...style }} />
        ))}
      </div>

      {/* ── CSS particles ── */}
      {!reducedMotion && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}>
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: p.left,
                top: p.top,
                width: p.width,
                height: p.height,
                borderRadius: "50%",
                background: p.color,
                opacity: p.opacity,
                animation: `obs-data-pulse ${p.duration} ease-in-out ${p.delay} infinite`,
              } as CSSVarStyle}
            />
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Split layout: character left, dashboard right */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(200px, 320px) 1fr",
            gap: "0",
            overflow: "hidden",
          }}
          aria-label="Observatory layout"
        >
          {/* Character slot */}
          <div
            style={{
              borderRight: "1px solid rgba(60, 140, 220, 0.12)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "16px",
              gap: "12px",
            }}
            aria-label="CFO character area"
          >
            {characterSlot}
          </div>

          {/* Dashboard slot */}
          <div
            style={{
              overflow: "auto",
              padding: "16px 20px",
            }}
            aria-label="Analytics dashboard"
          >
            {dashboardSlot}
          </div>
        </div>
      </div>

      {/* ── Bottom ticker strip ── */}
      <div style={{ position: "relative", zIndex: 20, flexShrink: 0 }}>
        <ObservatoryTicker stats={stats} />
      </div>
    </div>
  );
}
