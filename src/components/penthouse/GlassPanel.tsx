import { useRef, useState, useEffect, useCallback, type JSX } from "react";
import type React from "react";

/* ──────────────────────────────────────────────────────────────
   NOISE TEXTURE — SVG data URI used as CSS background overlay.
   Kept here because GlassPanel owns the noise rendering.
   ────────────────────────────────────────────────────────────── */
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  /** Overrides the default gold top-border accent colour */
  accentColor?: string;
  /** Milliseconds to delay the fade-in entrance animation */
  delay?: number;
}

/**
 * GlassPanel — frosted-glass card with:
 *  - noise texture overlay
 *  - delayed opacity/translateY entrance animation
 *  - 3-D tilt + inner-glow on mouse move
 *  - border brighten on hover
 */
export function GlassPanel({
  children,
  className = "",
  accentColor,
  delay = 0,
}: GlassPanelProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg) scale(1.01)`;
    el.style.boxShadow = `
      0 20px 60px rgba(0, 0, 0, 0.55),
      0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 0 40px rgba(201, 168, 76, 0.04),
      ${x * 36}px ${y * 36}px 70px rgba(201, 168, 76, 0.07),
      0 0 0 1px rgba(201, 168, 76, 0.08)
    `;
    /* rgba(201, 168, 76, …) = --gold */
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
    el.style.boxShadow =
      "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08)";
    setHovered(false);
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-xl ${className}`}
      style={{
        background: "rgba(14, 16, 32, 0.92)",
        backdropFilter: "blur(24px) saturate(1.5)",
        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        border: hovered
          ? "1px solid rgba(201, 168, 76, 0.3)"   /* --gold at 30% */
          : "1px solid rgba(255, 255, 255, 0.12)",
        borderTop: `2px solid ${accentColor ?? "rgba(201, 168, 76, 0.55)"}`, /* --gold at 55% */
        boxShadow:
          "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        backgroundImage: NOISE_SVG,
        backgroundBlendMode: "overlay",
        willChange: "transform, box-shadow",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0)"
          : "perspective(900px) rotateX(8deg) translateY(24px)",
        transition: "opacity 0.65s ease-out, transform 0.65s ease-out, border-color 0.25s ease-out",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
