"use client";

import { type JSX } from "react";
import type { WeatherCondition } from "@/app/api/weather/route";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ─── Rain ───────────────────────────────────────────────────────────────────

function RainEffect(): JSX.Element {
  const drops = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: (i * 5) % 100,
    height: 12 + (i % 6) * 4,
    opacity: 0.12 + (i % 5) * 0.04,
    duration: 0.55 + (i % 4) * 0.1,
    delay: (i * 0.11) % 1,
  }));

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      {drops.map((d) => (
        <span
          key={d.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${d.left}%`,
            width: "1px",
            height: `${d.height}px`,
            background:
              `linear-gradient(to bottom, transparent 0%, rgba(180,210,255,${d.opacity}) 50%, transparent 100%)`,
            animationName: "rain-fall",
            animationDuration: `${d.duration}s`,
            animationTimingFunction: "linear",
            animationDelay: `${d.delay}s`,
            animationIterationCount: "infinite",
            transform: "rotate(5deg)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Snow ───────────────────────────────────────────────────────────────────

function SnowEffect(): JSX.Element {
  const flakes = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: (i * 7) % 95,
    size: 3 + (i % 4),
    sway: (i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 8),
    opacity: 0.5 + (i % 3) * 0.15,
    duration: 4 + (i % 5) * 1.2,
    delay: (i * 0.3) % 4,
  }));

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      {flakes.map((f) => (
        <span
          key={f.id}
          style={{
            position: "absolute",
            top: "-5%",
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            borderRadius: "50%",
            background: `rgba(255, 255, 255, ${f.opacity})`,
            animationName: "snow-fall",
            animationDuration: `${f.duration}s`,
            animationTimingFunction: "ease-in-out",
            animationDelay: `${f.delay}s`,
            animationIterationCount: "infinite",
            "--sway": `${f.sway}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Thunderstorm ───────────────────────────────────────────────────────────

function ThunderstormEffect(): JSX.Element {
  return (
    <>
      <RainEffect />
      {/* Overlay that pulses on/off to simulate lightning */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          background: "rgba(200, 220, 255, 1)",
          animationName: "thunder-flash",
          animationDuration: "10s",
          animationTimingFunction: "ease-in-out",
          animationDelay: "2s",
          animationIterationCount: "infinite",
        }}
      />
    </>
  );
}

// ─── Fog ────────────────────────────────────────────────────────────────────

function FogEffect(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        background:
          "linear-gradient(to top, rgba(180,185,200,0.32) 0%, rgba(180,185,200,0.18) 33%, transparent 60%)",
      }}
    />
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface WeatherEffectsProps {
  condition: WeatherCondition;
}

/**
 * WeatherEffects — absolutely positioned over the skyline, behind floor content.
 * Only renders animated overlays; honors prefers-reduced-motion.
 */
export function WeatherEffects({ condition }: WeatherEffectsProps): JSX.Element {
  const reduced = useReducedMotion();

  // Fog is a static overlay — show even with reduced motion
  if (condition === "fog") {
    return <FogEffect />;
  }

  // Animated effects: skip if reduced motion
  if (reduced) return <></>;

  if (condition === "rain") return <RainEffect />;
  if (condition === "snow") return <SnowEffect />;
  if (condition === "thunderstorm") return <ThunderstormEffect />;

  // clear / clouds — no overlay needed
  return <></>;
}
