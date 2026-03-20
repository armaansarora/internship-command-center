import { useState, type JSX } from "react";

/* ──────────────────────────────────────────────────────────────
   NOISE TEXTURE — SVG data URI used as CSS background overlay.
   Duplicated here so this component is self-contained; the
   string is tiny and tree-shaken at build time.
   ────────────────────────────────────────────────────────────── */
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

/* ──────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────── */

export interface QuickActionConfig {
  label: string;
  desc: string;
  phase: string;
  icon: JSX.Element;
  /** CSS colour value — e.g. `"#C9A84C"` (--gold) */
  accentColor: string;
  glowColor: string;
  borderColor: string;
}

interface QuickActionCardProps {
  action: QuickActionConfig;
  /** Index used to stagger the slide-in animation */
  index: number;
}

/* ──────────────────────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────────────────────── */

/**
 * QuickActionCard — disabled glass button with icon, phase badge,
 * label, description and a hover glow spot.
 *
 * All items are currently disabled (coming-soon). Interactive
 * elements carry aria-label, aria-disabled and title attributes.
 */
export function QuickActionCard({ action, index }: QuickActionCardProps): JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      disabled
      aria-label={`${action.label} — ${action.phase} — Coming soon`}
      aria-disabled="true"
      title="Coming soon"
      className="text-left cursor-not-allowed rounded-xl p-5 relative overflow-hidden"
      style={{
        background: hovered ? "rgba(14, 16, 32, 0.94)" : "rgba(14, 16, 32, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: hovered
          ? `1px solid ${action.borderColor}`
          : "1px solid rgba(255, 255, 255, 0.12)",
        borderTop: `2px solid ${hovered ? action.accentColor : `${action.accentColor}88`}`,
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.4), inset 0 0 24px ${action.glowColor}`
          : "0 4px 20px rgba(0,0,0,0.3)",
        backgroundImage: NOISE_SVG,
        backgroundBlendMode: "overlay",
        opacity: hovered ? 1 : 0.85,
        transform: hovered ? "translateY(-3px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.25s ease-out",
        willChange: "transform, opacity, box-shadow",
        animation: `slide-in-left 0.4s ease-out ${index * 100}ms both`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div
        className="mb-3"
        aria-hidden="true"
        style={{
          color: action.accentColor,
          opacity: hovered ? 1 : 0.75,
          transition: "opacity 0.25s ease",
        }}
      >
        {action.icon}
      </div>

      {/* Phase badge */}
      <div
        style={{
          display: "inline-block",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: action.accentColor,
          background: `${action.accentColor}18`,
          border: `1px solid ${action.accentColor}40`,
          borderRadius: "4px",
          padding: "2px 6px",
          marginBottom: "8px",
        }}
      >
        {action.phase}
      </div>

      {/* Label */}
      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {action.label}
      </div>

      {/* Description */}
      <div className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {action.desc}
      </div>

      {/* Hover glow spot — decorative, absolutely positioned */}
      {hovered && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-20px",
            right: "-20px",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: action.glowColor,
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}
