"use client";

import { useCallback, useEffect, useRef, type JSX } from "react";
import type { FloorId } from "@/types/ui";

interface SkylineProps {
  floorId: FloorId;
}

/**
 * Floor-height mapping: higher floors see more sky, lower floors see more buildings.
 * Returns a Y-offset percentage — positive = shift buildings down (see more sky).
 */
const FLOOR_HEIGHT: Record<FloorId, number> = {
  PH: 35,  // Penthouse: highest view, most sky
  "7": 28,
  "6": 22,
  "5": 17,
  "4": 12,
  "3": 8,
  "2": 5,
  "1": 2,
  L: 0,    // Lobby: ground level, buildings dominate
};

/**
 * Parallax multipliers for each layer — far layers move less.
 */
const PARALLAX = {
  far: 0.01,
  mid: 0.025,
  near: 0.04,
  foreground: 0.06,
} as const;

/**
 * NYC Skyline — 4 layered SVG depth layers with mouse-driven parallax.
 *
 * Layers:
 * 1. Far distance: faint silhouettes (Empire State, One WTC outlines)
 * 2. Mid distance: recognizable buildings with moderate detail
 * 3. Near distance: prominent buildings with lit windows
 * 4. Foreground: window frame / structural element
 *
 * All layers respond to:
 * - Mouse movement (horizontal parallax)
 * - Floor height (vertical offset — higher floors = more sky)
 * - Day/night cycle (window lights via CSS vars)
 */
export function Skyline({ floorId }: SkylineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  const heightOffset = FLOOR_HEIGHT[floorId];

  const animate = useCallback(() => {
    const mx = mouseRef.current.x - 0.5; // -0.5 to 0.5
    const my = mouseRef.current.y - 0.5;
    const multipliers = [PARALLAX.far, PARALLAX.mid, PARALLAX.near, PARALLAX.foreground];

    layersRef.current.forEach((layer, i) => {
      if (!layer) return;
      const m = multipliers[i] ?? 0;
      const tx = mx * m * 100; // px
      const ty = my * m * 40;  // px (less vertical movement)
      layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    });

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  const setLayerRef = (idx: number) => (el: HTMLDivElement | null) => {
    layersRef.current[idx] = el;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: "var(--z-skyline)" as string }}
      aria-hidden="true"
    >
      {/* Layer 0: Far distance — faint silhouettes */}
      <div
        ref={setLayerRef(0)}
        className="absolute inset-x-0 will-change-transform"
        style={{ bottom: `${heightOffset - 10}%`, height: "60%" }}
      >
        <svg
          viewBox="0 0 1400 400"
          preserveAspectRatio="xMidYMax slice"
          className="w-full h-full"
          fill="none"
        >
          <g opacity="0.15">
            {/* Far cityscape silhouettes */}
            <rect x="50" y="180" width="30" height="220" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="90" y="150" width="25" height="250" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="130" y="200" width="40" height="200" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="180" y="160" width="20" height="240" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="220" y="120" width="35" height="280" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="270" y="170" width="28" height="230" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="320" y="190" width="45" height="210" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="380" y="130" width="22" height="270" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="420" y="200" width="38" height="200" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="470" y="155" width="26" height="245" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="510" y="175" width="50" height="225" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="580" y="140" width="30" height="260" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="620" y="195" width="35" height="205" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="670" y="165" width="24" height="235" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="710" y="185" width="42" height="215" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="770" y="145" width="28" height="255" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="820" y="200" width="36" height="200" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="870" y="160" width="20" height="240" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="910" y="180" width="32" height="220" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="960" y="150" width="40" height="250" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1020" y="190" width="25" height="210" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1060" y="170" width="35" height="230" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1110" y="200" width="30" height="200" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1160" y="140" width="28" height="260" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1210" y="175" width="38" height="225" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1270" y="195" width="45" height="205" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1330" y="165" width="22" height="235" fill="currentColor" className="text-[var(--text-muted)]" />
          </g>
        </svg>
      </div>

      {/* Layer 1: Mid distance — recognizable NYC buildings */}
      <div
        ref={setLayerRef(1)}
        className="absolute inset-x-0 will-change-transform"
        style={{ bottom: `${heightOffset - 5}%`, height: "55%" }}
      >
        <svg
          viewBox="0 0 1400 380"
          preserveAspectRatio="xMidYMax slice"
          className="w-full h-full"
          fill="none"
        >
          <g opacity="0.3">
            {/* Mid-distance buildings with some detail */}
            {/* Empire State Building shape */}
            <g className="text-[var(--text-muted)]">
              <rect x="280" y="60" width="50" height="320" fill="currentColor" />
              <rect x="290" y="20" width="30" height="40" fill="currentColor" />
              <rect x="300" y="0" width="10" height="20" fill="currentColor" />
              {/* Antenna */}
              <rect x="303" y="-30" width="4" height="30" fill="currentColor" />
            </g>
            {/* Chrysler Building shape */}
            <g className="text-[var(--text-muted)]">
              <rect x="680" y="80" width="45" height="300" fill="currentColor" />
              <polygon points="680,80 702.5,30 725,80" fill="currentColor" />
              <rect x="698" y="10" width="9" height="20" fill="currentColor" />
            </g>
            {/* One WTC shape */}
            <g className="text-[var(--text-muted)]">
              <polygon points="1050,380 1060,40 1100,40 1110,380" fill="currentColor" />
              <rect x="1075" y="0" width="10" height="40" fill="currentColor" />
            </g>
            {/* Generic towers */}
            <rect x="100" y="140" width="60" height="240" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="180" y="160" width="45" height="220" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="400" y="120" width="55" height="260" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="480" y="180" width="40" height="200" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="560" y="150" width="50" height="230" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="790" y="130" width="55" height="250" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="870" y="170" width="40" height="210" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="940" y="145" width="48" height="235" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1170" y="160" width="50" height="220" fill="currentColor" className="text-[var(--text-muted)]" />
            <rect x="1250" y="140" width="45" height="240" fill="currentColor" className="text-[var(--text-muted)]" />
          </g>
        </svg>
      </div>

      {/* Layer 2: Near distance — prominent buildings with window detail */}
      <div
        ref={setLayerRef(2)}
        className="absolute inset-x-0 will-change-transform"
        style={{ bottom: `${heightOffset}%`, height: "50%" }}
      >
        <svg
          viewBox="0 0 1400 350"
          preserveAspectRatio="xMidYMax slice"
          className="w-full h-full"
          fill="none"
        >
          {/* Building bodies */}
          <g opacity="0.5" className="text-[var(--tower-surface)]">
            <rect x="20" y="100" width="80" height="250" fill="currentColor" />
            <rect x="120" y="130" width="70" height="220" fill="currentColor" />
            <rect x="220" y="80" width="90" height="270" fill="currentColor" />
            <rect x="340" y="140" width="75" height="210" fill="currentColor" />
            <rect x="450" y="60" width="85" height="290" fill="currentColor" />
            <rect x="570" y="110" width="65" height="240" fill="currentColor" />
            <rect x="660" y="90" width="95" height="260" fill="currentColor" />
            <rect x="780" y="120" width="70" height="230" fill="currentColor" />
            <rect x="880" y="70" width="80" height="280" fill="currentColor" />
            <rect x="990" y="100" width="75" height="250" fill="currentColor" />
            <rect x="1090" y="140" width="85" height="210" fill="currentColor" />
            <rect x="1200" y="90" width="70" height="260" fill="currentColor" />
            <rect x="1300" y="110" width="80" height="240" fill="currentColor" />
          </g>
          {/* Window lights — visible at night/dusk via CSS opacity */}
          <g
            className="transition-opacity duration-[3000ms]"
            style={{ opacity: "var(--city-lights-opacity)" }}
          >
            {generateWindowLights(20, 100, 80, 250, 8, 15)}
            {generateWindowLights(220, 80, 90, 270, 9, 18)}
            {generateWindowLights(450, 60, 85, 290, 8, 20)}
            {generateWindowLights(660, 90, 95, 260, 9, 17)}
            {generateWindowLights(880, 70, 80, 280, 8, 19)}
            {generateWindowLights(1200, 90, 70, 260, 7, 17)}
          </g>
        </svg>
      </div>

      {/* Layer 3: Stars (night only) */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms]"
        style={{ opacity: "var(--star-opacity)" }}
      >
        <svg viewBox="0 0 1400 600" className="w-full h-full" fill="none">
          {generateStars(80)}
        </svg>
      </div>

      {/* Layer 4: Foreground — window frame */}
      <div
        ref={setLayerRef(3)}
        className="absolute inset-0 will-change-transform pointer-events-none"
      >
        {/* Subtle window frame vignette */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow: "inset 0 0 120px 40px rgba(10, 10, 20, 0.5)",
          }}
        />
        {/* Window mullions — vertical dividers */}
        <div className="absolute inset-0 flex justify-between px-[8%]">
          <div className="w-px h-full bg-[var(--glass-border)] opacity-20" />
          <div className="w-px h-full bg-[var(--glass-border)] opacity-20" />
          <div className="w-px h-full bg-[var(--glass-border)] opacity-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Generate scattered window lights for a building rectangle.
 * Only ~40% of windows are lit for realism.
 */
function generateWindowLights(
  bx: number, by: number, bw: number, bh: number,
  cols: number, rows: number,
): JSX.Element {
  const lights: JSX.Element[] = [];
  const wSize = 3;
  const gapX = (bw - cols * wSize) / (cols + 1);
  const gapY = (bh - rows * wSize) / (rows + 1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Deterministic pseudo-random: light ~40% of windows
      const seed = (bx * 7 + r * 13 + c * 17) % 100;
      if (seed > 40) continue;

      const x = bx + gapX + c * (wSize + gapX);
      const y = by + gapY + r * (wSize + gapY);
      const warmth = seed % 3 === 0 ? "#FBBF24" : seed % 3 === 1 ? "#F0EDE6" : "#E8C45A";

      lights.push(
        <rect
          key={`w-${bx}-${r}-${c}`}
          x={x}
          y={y}
          width={wSize}
          height={wSize}
          fill={warmth}
          opacity={0.6 + (seed % 30) / 100}
          rx={0.5}
        />,
      );
    }
  }

  return <g>{lights}</g>;
}

/**
 * Generate star dots for the night sky.
 */
function generateStars(count: number): JSX.Element {
  const stars: JSX.Element[] = [];
  for (let i = 0; i < count; i++) {
    // Deterministic positions using index-based math
    const x = ((i * 137 + 53) % 1400);
    const y = ((i * 97 + 29) % 350);
    const r = 0.5 + (i % 3) * 0.4;
    const opacity = 0.3 + (i % 5) * 0.12;

    stars.push(
      <circle
        key={`star-${i}`}
        cx={x}
        cy={y}
        r={r}
        fill="#F0EDE6"
        opacity={opacity}
      />,
    );
  }
  return <g>{stars}</g>;
}
