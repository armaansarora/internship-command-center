"use client";

import type { JSX } from "react";
import type { InterruptType } from "../star/interrupt-rules";

/**
 * InterruptBubble.
 *
 * CPO's mid-answer cut-in. The bubble pops above the answer textarea with
 * a terse, role-appropriate line ("That's the setup. What did YOU do?").
 * The candidate can dismiss — dismissal closes the bubble but the drill
 * state already recorded the interrupt via INTERRUPT event.
 *
 * aria-live="assertive" because the whole point is that the candidate
 * must hear it through their answering train of thought.
 */

interface Props {
  type: InterruptType;
  prompt: string;
  onDismiss: () => void;
}

export function InterruptBubble({
  type,
  prompt,
  onDismiss,
}: Props): JSX.Element {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-interrupt-type={type}
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: 420,
        padding: "10px 28px 10px 14px",
        borderRadius: "12px 12px 12px 0",
        background: "linear-gradient(135deg, #0D1524, #1A2E4A)",
        border: "1px solid #4A9EDB",
        boxShadow: "0 4px 16px rgba(74,158,219,0.2)",
        color: "#E8F4FD",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        animation: "interrupt-pop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: 9,
          color: "#7EC8E3",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        CPO —
      </span>
      {prompt}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss CPO interrupt"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          background: "none",
          border: 0,
          color: "#7EC8E3",
          fontSize: 14,
          lineHeight: 1,
          cursor: "pointer",
          padding: 4,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes interrupt-pop {
          from { transform: translateY(4px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes interrupt-pop {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
