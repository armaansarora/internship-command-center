import { useState, type JSX, type ReactNode } from "react";

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
  icon: JSX.Element | ReactNode;
  /** CSS colour value — e.g. `"#C9A84C"` (--gold) */
  accentColor: string;
  glowColor: string;
  borderColor: string;
  /**
   * @deprecated R2 bans the "Phase 1 / Phase 2" badge. Field kept optional
   * only for the old penthouse-client compile path; removed in R2.10. Do
   * not set on new callers.
   */
  phase?: string;
}

interface QuickActionCardProps {
  action: QuickActionConfig;
  /** Index used to stagger the slide-in animation */
  index: number;
  /** Click handler — the card is no longer disabled; parent owns dispatch. */
  onClick?: () => void;
  /** When true, the card renders in a pending/pulse state during dispatch. */
  pending?: boolean;
}

/* ──────────────────────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────────────────────── */

/**
 * QuickActionCard — live glass button with icon, label, and description.
 *
 * no longer disabled; the banned "Phase 1 / Phase 2" badge has been
 * removed per brief. Click dispatches via the parent; `pending` draws a
 * subtle pulsing accent while the pneumatic-tube overlay plays.
 */
export function QuickActionCard({ action, index, onClick, pending = false }: QuickActionCardProps): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const active = hovered || pending;

  return (
    <button
      type="button"
      aria-label={action.label}
      onClick={onClick}
      disabled={pending}
      className="text-left rounded-xl p-5 relative overflow-hidden"
      style={{
        background: active ? "rgba(14, 16, 32, 0.94)" : "rgba(14, 16, 32, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: active
          ? `1px solid ${action.borderColor}`
          : "1px solid rgba(255, 255, 255, 0.12)",
        borderTop: `2px solid ${active ? action.accentColor : `${action.accentColor}88`}`,
        boxShadow: active
          ? `0 8px 32px rgba(0,0,0,0.4), inset 0 0 24px ${action.glowColor}`
          : "0 4px 20px rgba(0,0,0,0.3)",
        backgroundImage: NOISE_SVG,
        backgroundBlendMode: "overlay",
        opacity: pending ? 0.95 : active ? 1 : 0.9,
        transform: active ? "translateY(-3px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.25s ease-out",
        willChange: "transform, opacity, box-shadow",
        animation: `slide-in-left 0.4s ease-out ${index * 100}ms both`,
        cursor: pending ? "progress" : "pointer",
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
          opacity: active ? 1 : 0.75,
          transition: "opacity 0.25s ease",
        }}
      >
        {action.icon}
      </div>

      {/* Label */}
      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {action.label}
      </div>

      {/* Description */}
      <div className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {action.desc}
      </div>

      {/* Hover / pending glow spot */}
      {(active || pending) && (
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
            animation: pending ? "quick-action-pulse 1.4s ease-in-out infinite" : undefined,
          }}
        />
      )}
    </button>
  );
}
