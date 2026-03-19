"use client";

import type { JSX } from "react";

interface AtmosphericEffectsProps {
  isDark: boolean;
}

/**
 * AtmosphericEffects — CSS-only atmospheric layers that overlay the skyline.
 *
 * Includes:
 * - Vignette: dark edges framing the view (like looking through a window)
 * - Height fog: semi-transparent gradient at the base of the skyline
 * - Night bloom: soft glow on city lights (night only)
 *
 * All effects use only CSS — zero JS, zero performance cost beyond compositing.
 */
export function AtmosphericEffects({ isDark }: AtmosphericEffectsProps): JSX.Element {
  return (
    <>
      {/* Vignette — dark edges */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: `radial-gradient(
            ellipse 80% 70% at 50% 50%,
            transparent 50%,
            rgba(10, 10, 20, 0.4) 100%
          )`,
        }}
      />

      {/* Height fog — bottom of skyline */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        aria-hidden="true"
        style={{
          height: "30%",
          background: isDark
            ? "linear-gradient(to top, rgba(10, 10, 20, 0.8) 0%, rgba(10, 10, 20, 0.3) 40%, transparent 100%)"
            : "linear-gradient(to top, rgba(200, 200, 210, 0.4) 0%, rgba(200, 200, 210, 0.15) 40%, transparent 100%)",
          transition: "background 3s ease",
        }}
      />

      {/* Night bloom glow — city light haze at horizon */}
      <div
        className="pointer-events-none absolute inset-x-0 transition-opacity duration-[3000ms]"
        aria-hidden="true"
        style={{
          bottom: "15%",
          height: "35%",
          opacity: isDark ? 0.5 : 0,
          background: "radial-gradient(ellipse 100% 60% at 50% 80%, rgba(201, 168, 76, 0.15) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Top sky fade — helps blend sky layer edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        aria-hidden="true"
        style={{
          height: "15%",
          background: isDark
            ? "linear-gradient(to bottom, rgba(10, 10, 30, 0.6) 0%, transparent 100%)"
            : "linear-gradient(to bottom, rgba(135, 180, 235, 0.2) 0%, transparent 100%)",
          transition: "background 3s ease",
        }}
      />
    </>
  );
}
