"use client";

import type { JSX } from "react";

/**
 * WindowTint — glass effect overlay simulating looking through a penthouse window.
 *
 * Applies a subtle backdrop-filter blur + gradient to create the feeling
 * of glass between the viewer and the skyline. Combined with the dashboard
 * UI on top, this makes the whole experience feel like holographic displays
 * mounted on a real window.
 */
export function WindowTint(): JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      style={{
        // Subtle glass tint responding to day/night CSS vars
        backgroundColor: "var(--window-tint)",
        // Very light blur for glass effect — not enough to obscure the skyline
        backdropFilter: "blur(0.5px) brightness(1.02)",
        WebkitBackdropFilter: "blur(0.5px) brightness(1.02)",
        // Edge gradient for window frame feel
        maskImage: "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 60%, black 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 60%, black 100%)",
        transition: "background-color 3s ease",
      }}
    />
  );
}
