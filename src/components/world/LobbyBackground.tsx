"use client";

import type { JSX } from "react";

/**
 * LobbyBackground — CSS-only luxury office reception hall.
 *
 * BUG-010: The lobby should NOT share the skyline with the penthouse.
 * This replaces ProceduralSkyline for floor "L" with a ground-level
 * luxury aesthetic: dark marble, golden overhead lighting, architectural
 * pillar lines, and a polished floor reflection zone.
 *
 * All visual elements are pure CSS gradients — zero images, zero canvas,
 * zero JS. prefers-reduced-motion: animations are already minimal (just
 * a slow chandelier pulse), so no special handling needed.
 */
export function LobbyBackground(): JSX.Element {
  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      {/* ── BASE: Dark marble/stone gradient ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% 20%, rgba(18, 16, 24, 1) 0%, rgba(8, 7, 14, 1) 100%)
          `,
        }}
      />

      {/* ── MARBLE VEINING: Very subtle diagonal streaks ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              115deg,
              transparent 0px,
              transparent 80px,
              rgba(201, 168, 76, 0.012) 80px,
              rgba(201, 168, 76, 0.018) 82px,
              transparent 84px,
              transparent 200px
            ),
            repeating-linear-gradient(
              155deg,
              transparent 0px,
              transparent 120px,
              rgba(180, 160, 120, 0.008) 120px,
              rgba(180, 160, 120, 0.014) 121px,
              transparent 123px,
              transparent 280px
            )
          `,
          opacity: 0.8,
        }}
      />

      {/* ── CEILING: Warm overhead ambient light ── */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "35%",
          background: `
            radial-gradient(ellipse 60% 100% at 50% 0%, rgba(201, 168, 76, 0.08) 0%, rgba(201, 168, 76, 0.03) 40%, transparent 80%)
          `,
        }}
      />

      {/* ── CHANDELIER: Central golden glow from above ── */}
      <div
        className="absolute"
        style={{
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
          width: "400px",
          height: "300px",
          background: `
            radial-gradient(ellipse 100% 100% at 50% 0%, rgba(201, 168, 76, 0.1) 0%, rgba(201, 168, 76, 0.04) 40%, transparent 70%)
          `,
          animation: "chandelier-pulse 8s ease-in-out infinite",
        }}
      />

      {/* ── ARCHITECTURAL PILLARS: Vertical lines at intervals ── */}
      {[12, 28, 72, 88].map((pos) => (
        <div
          key={pos}
          className="absolute top-0 bottom-0"
          style={{
            left: `${pos}%`,
            width: "1px",
            background: `linear-gradient(
              to bottom,
              rgba(201, 168, 76, 0.06) 0%,
              rgba(201, 168, 76, 0.03) 30%,
              rgba(201, 168, 76, 0.015) 60%,
              rgba(201, 168, 76, 0.04) 85%,
              rgba(201, 168, 76, 0.06) 100%
            )`,
          }}
        />
      ))}

      {/* ── PILLAR CAPITALS: Wider glow at top of each pillar ── */}
      {[12, 28, 72, 88].map((pos) => (
        <div
          key={`cap-${pos}`}
          className="absolute top-0"
          style={{
            left: `${pos}%`,
            transform: "translateX(-50%)",
            width: "60px",
            height: "80px",
            background: `radial-gradient(ellipse 100% 100% at 50% 0%, rgba(201, 168, 76, 0.04) 0%, transparent 100%)`,
          }}
        />
      ))}

      {/* ── FLOOR: Polished marble reflection zone (bottom 30%) ── */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "30%",
          background: `
            linear-gradient(to bottom,
              transparent 0%,
              rgba(201, 168, 76, 0.015) 20%,
              rgba(201, 168, 76, 0.025) 60%,
              rgba(201, 168, 76, 0.04) 100%
            )
          `,
        }}
      />

      {/* ── FLOOR REFLECTION: Mirror-like horizontal line ── */}
      <div
        className="absolute inset-x-0"
        style={{
          bottom: "28%",
          height: "1px",
          background: `linear-gradient(to right,
            transparent 5%,
            rgba(201, 168, 76, 0.06) 15%,
            rgba(201, 168, 76, 0.12) 35%,
            rgba(201, 168, 76, 0.15) 50%,
            rgba(201, 168, 76, 0.12) 65%,
            rgba(201, 168, 76, 0.06) 85%,
            transparent 95%
          )`,
        }}
      />

      {/* ── FLOOR GRID: Subtle marble tile pattern ── */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "30%",
          backgroundImage: `
            linear-gradient(rgba(201, 168, 76, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 168, 76, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: "120px 60px",
          backgroundPosition: "center bottom",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 40%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 40%)",
        }}
      />

      {/* ── WALL SCONCES: Warm side lighting ── */}
      {[18, 82].map((pos) => (
        <div
          key={`sconce-${pos}`}
          className="absolute"
          style={{
            top: "25%",
            left: `${pos}%`,
            transform: "translateX(-50%)",
            width: "120px",
            height: "200px",
            background: `radial-gradient(ellipse 100% 120% at 50% 0%, rgba(201, 168, 76, 0.05) 0%, transparent 70%)`,
          }}
        />
      ))}

      {/* ── AMBIENT NOISE TEXTURE: Very subtle grain ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: "150px 150px",
          opacity: 0.5,
          mixBlendMode: "overlay",
        }}
      />

      {/* ── VIGNETTE ── */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 200px 80px rgba(4, 5, 12, 0.65)",
        }}
      />

      {/* ── KEYFRAMES ── */}
      <style>{`
        @keyframes chandelier-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes chandelier-pulse {
            0%, 100% { opacity: 0.9; }
          }
        }
      `}</style>
    </div>
  );
}
