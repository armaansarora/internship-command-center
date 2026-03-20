"use client";

import { useEffect, useState, type JSX } from "react";
import type { Milestone } from "@/lib/progression/milestones";

interface MilestoneToastProps {
  milestone: Milestone;
  onDismiss: () => void;
}

/** Confetti particle rendered inside the toast (CSS-only animation). */
function ConfettiParticle({
  index,
}: {
  index: number;
}): JSX.Element {
  const colors = ["#C9A84C", "#E8C45A", "#FFFFFF", "#8B7634", "#F0EDE6"];
  const color = colors[index % colors.length];
  const drift = (index % 2 === 0 ? 1 : -1) * (8 + (index % 5) * 6);
  const delay = (index * 0.07).toFixed(2);
  const size = 3 + (index % 3);

  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: `${10 + (index % 9) * 9}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: index % 3 === 0 ? "50%" : "1px",
        background: color,
        animationName: "milestone-confetti-drift",
        animationDuration: "0.8s",
        animationTimingFunction: "ease-out",
        animationDelay: `${delay}s`,
        animationFillMode: "forwards",
        "--drift": `${drift}px`,
      } as React.CSSProperties}
    />
  );
}

/**
 * MilestoneToast — gold notification that appears when a milestone is unlocked.
 * Auto-dismisses after 5 seconds.
 * CSS-only confetti animation.
 */
export function MilestoneToast({
  milestone,
  onDismiss,
}: MilestoneToastProps): JSX.Element {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setLeaving(true);
    }, 4600);

    const removeTimer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(removeTimer);
    };
  }, [onDismiss]);

  const floorLabel =
    milestone.floor === "ALL"
      ? "All Floors"
      : milestone.floor === "PH"
        ? "Penthouse"
        : `Floor ${milestone.floor}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        bottom: "5rem",
        right: "1.5rem",
        zIndex: 9999,
        width: "min(340px, calc(100vw - 3rem))",
        animationName: leaving ? "milestone-slide-out" : "milestone-slide-in",
        animationDuration: "0.4s",
        animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        animationFillMode: "both",
      }}
    >
      {/* Outer glow ring */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-2px",
          borderRadius: "14px",
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0.1) 50%, rgba(201,168,76,0.4) 100%)",
          zIndex: -1,
        }}
      />

      {/* Toast body */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "12px",
          background:
            "linear-gradient(135deg, rgba(10, 10, 20, 0.97) 0%, rgba(26, 26, 46, 0.97) 100%)",
          border: "1px solid rgba(201, 168, 76, 0.35)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: "1rem 1.25rem",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.12)",
        }}
      >
        {/* Confetti particles */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>

        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          {/* Trophy icon */}
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(201, 168, 76, 0.15)",
              border: "1px solid rgba(201, 168, 76, 0.3)",
              flexShrink: 0,
              fontSize: "14px",
            }}
          >
            ★
          </span>

          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold)",
              opacity: 0.8,
            }}
          >
            Milestone Unlocked
          </span>

          {/* Dismiss button */}
          <button
            type="button"
            aria-label="Dismiss milestone notification"
            onClick={() => {
              setLeaving(true);
              setTimeout(onDismiss, 400);
            }}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.35)",
              fontSize: "14px",
              lineHeight: 1,
              padding: "2px 4px",
              minHeight: "unset",
              minWidth: "unset",
              borderRadius: "4px",
              transition: "color 150ms ease",
            }}
          >
            ✕
          </button>
        </div>

        {/* Milestone name */}
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--gold)",
            margin: "0 0 0.25rem",
            lineHeight: 1.3,
          }}
        >
          {milestone.label}
        </p>

        {/* Description */}
        <p
          style={{
            fontFamily: "Satoshi, sans-serif",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            margin: "0 0 0.5rem",
            lineHeight: 1.5,
          }}
        >
          {milestone.description}
        </p>

        {/* Floor badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(201, 168, 76, 0.08)",
            border: "1px solid rgba(201, 168, 76, 0.2)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              background: "var(--gold)",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "rgba(201, 168, 76, 0.8)",
              letterSpacing: "0.06em",
            }}
          >
            {floorLabel}
          </span>
        </div>

        {/* Progress bar (5s drain) */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "2px",
            background: "rgba(201, 168, 76, 0.6)",
            animationName: "milestone-toast-drain",
            animationDuration: "5s",
            animationTimingFunction: "linear",
            animationFillMode: "forwards",
          }}
        />
      </div>

      <style>{`
        @keyframes milestone-toast-drain {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/** Container that manages a queue of milestone toasts. */
export function MilestoneToastQueue({
  milestones,
  onMilestoneDismissed,
}: {
  milestones: Milestone[];
  onMilestoneDismissed: (id: string) => void;
}): JSX.Element {
  if (milestones.length === 0) return <></>;

  // Show most recent on top (last in array)
  const current = milestones[milestones.length - 1];

  return (
    <MilestoneToast
      milestone={current}
      onDismiss={() => onMilestoneDismissed(current.id)}
    />
  );
}
