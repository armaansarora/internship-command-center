"use client";

import { type JSX } from "react";
import type { FloorId } from "@/types/ui";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useSkylineVariant } from "@/hooks/useSkylineVariant";
import { SkylineLayers } from "./SkylineLayers";
import { AtmosphericEffects } from "./AtmosphericEffects";
import { WindowTint } from "./WindowTint";
import { DustMotes } from "./DustMotes";

interface SkylineSceneProps {
  floorId: FloorId;
}

/**
 * SkylineScene — master component for the immersive NYC skyline background.
 *
 * Architecture (back to front):
 * 1. Sky gradient (CSS vars from day/night cycle)
 * 2. Day skyline layers (4x WebP in CSS 3D perspective)
 * 3. Night skyline layers (4x WebP, crossfaded via opacity)
 * 4. Atmospheric effects (vignette, height fog, bloom)
 * 5. Dust motes (tsParticles, lazy-initialized internally)
 * 6. Window tint (glass effect overlay)
 *
 * Replaces the old SVG-based Skyline.tsx with photorealistic imagery.
 */
export function SkylineScene({ floorId }: SkylineSceneProps): JSX.Element {
  const { variant, isDark } = useSkylineVariant();
  const parallax = useMouseParallax({ smoothing: 0.06 });

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: "var(--z-skyline)" as string }}
      aria-hidden="true"
    >
      {/* Layer 0: Sky gradient (responds to data-time via CSS vars) */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            hsl(var(--sky-hue) var(--sky-saturation) var(--sky-lightness)),
            hsl(var(--sky-hue) calc(var(--sky-saturation) * 0.7) calc(var(--sky-lightness) * 0.6))
          )`,
          transition: "background 3s ease",
        }}
      />

      {/* Layer 1: Day skyline (visible during day) */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms]"
        style={{ opacity: isDark ? 0 : 1 }}
      >
        <SkylineLayers
          variant="day"
          floorId={floorId}
          parallaxX={parallax.x}
          parallaxY={parallax.y}
        />
      </div>

      {/* Layer 2: Night skyline (crossfades in during dusk/night) */}
      <div
        className="absolute inset-0 transition-opacity duration-[3000ms]"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        <SkylineLayers
          variant="night"
          floorId={floorId}
          parallaxX={parallax.x}
          parallaxY={parallax.y}
        />
      </div>

      {/* Layer 3: Atmospheric effects */}
      <AtmosphericEffects isDark={isDark} />

      {/* Layer 4: Dust motes (subtle floating particles) */}
      <DustMotes />

      {/* Layer 5: Window tint (glass overlay) */}
      <WindowTint />
    </div>
  );
}
