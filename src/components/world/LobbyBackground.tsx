"use client";

import { useMemo, useState, type JSX } from "react";

/**
 * LobbyBackground — AI-generated architectural sketch backgrounds.
 *
 * BUG-010: The lobby should NOT share the skyline with the penthouse.
 * Uses one of 4 AI-generated images (white pencil architectural sketches
 * on dark navy) randomly selected on each mount. Atmospheric overlays
 * (vignette, spotlight, grain) are layered on top for depth.
 *
 * Images: /lobby/bg-1.jpg through /lobby/bg-4.jpg
 *   1: Grand chandelier lobby with arched ceiling
 *   2: Elevator hall with parallel doors
 *   3: Reception desk with sunburst windows
 *   4: Spiral atrium looking up
 */

const LOBBY_IMAGES = [
  "/lobby/bg-1.jpg",
  "/lobby/bg-2.jpg",
  "/lobby/bg-3.jpg",
  "/lobby/bg-4.jpg",
] as const;

export function LobbyBackground(): JSX.Element {
  // Pick a random image once on mount — useMemo with empty deps
  // ensures it stays stable across re-renders but changes on remount
  const selectedImage = useMemo(
    () => LOBBY_IMAGES[Math.floor(Math.random() * LOBBY_IMAGES.length)],
    [],
  );

  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      {/* ── BASE: Dark foundation (visible before image loads) ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 20%, rgba(18, 16, 24, 1) 0%, rgba(8, 7, 14, 1) 100%)",
        }}
      />

      {/* ── AI IMAGE: Architectural sketch ── */}
      {/* Hidden img tag for onLoad event, actual display via background-image */}
      <img
        src={selectedImage}
        alt=""
        aria-hidden="true"
        onLoad={() => setLoaded(true)}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${selectedImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          opacity: loaded ? 0.35 : 0,
          transition: "opacity 1.2s ease-out",
        }}
      />

      {/* ── CEILING SPOTLIGHT: Warm overhead glow ── */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "40%",
          background:
            "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(201, 168, 76, 0.07) 0%, transparent 70%)",
        }}
      />

      {/* ── CENTER SPOTLIGHT: Soft golden focal point ── */}
      <div
        className="absolute"
        style={{
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60%",
          height: "55%",
          background:
            "radial-gradient(ellipse 100% 100% at 50% 30%, rgba(201, 168, 76, 0.04) 0%, transparent 60%)",
        }}
      />

      {/* ── FLOOR REFLECTION: Polished marble zone (bottom 25%) ── */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "25%",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(201, 168, 76, 0.012) 30%, rgba(201, 168, 76, 0.025) 100%)",
        }}
      />

      {/* ── AMBIENT GRAIN: Subtle texture overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: "150px 150px",
          opacity: 0.4,
          mixBlendMode: "overlay" as const,
        }}
      />

      {/* ── VIGNETTE: Dark edges for depth ── */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 200px 100px rgba(4, 5, 12, 0.7)",
        }}
      />

      {/* ── TOP GRADIENT FADE: Blend into header area ── */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "15%",
          background:
            "linear-gradient(to bottom, rgba(8, 7, 14, 0.8) 0%, transparent 100%)",
        }}
      />

      {/* ── BOTTOM GRADIENT FADE: Blend into footer area ── */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "10%",
          background:
            "linear-gradient(to top, rgba(8, 7, 14, 0.6) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
