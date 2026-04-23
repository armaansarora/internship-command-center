"use client";
import type { JSX } from "react";
import type { IdleDetailKind } from "@/hooks/useIdleDetail";

/**
 * IdleDetail — renders the small on-desk detail near the CEO.
 *
 * `long-pause` is an audio/temporal cue only (not a visual element) — the
 * parent scene reads the kind and delays beat reveal by 30s when it's
 * 'long-pause'. Here we render nothing for that kind.
 */
interface Props {
  kind: IdleDetailKind;
  /** Soft scale for embedding near the character. */
  scale?: number;
}

export function IdleDetail({ kind, scale = 1 }: Props): JSX.Element | null {
  if (kind === "long-pause") return null;

  if (kind === "photo-frame") {
    return (
      <div
        role="presentation"
        aria-label="photo frame on desk"
        style={{
          width: `${28 * scale}px`,
          height: `${36 * scale}px`,
          background: "rgba(201, 168, 76, 0.18)",
          border: "1.5px solid rgba(201, 168, 76, 0.4)",
          borderRadius: "3px",
          position: "relative",
          boxShadow: "0 3px 10px rgba(0,0,0,0.4), inset 0 0 6px rgba(0,0,0,0.5)",
        }}
      >
        {/* stand */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: `-${4 * scale}px`,
            left: "50%",
            transform: "translateX(-50%) rotate(8deg)",
            width: `${10 * scale}px`,
            height: `${8 * scale}px`,
            background: "rgba(201, 168, 76, 0.35)",
            borderRadius: "1px",
          }}
        />
      </div>
    );
  }

  if (kind === "pen") {
    return (
      <div
        role="presentation"
        aria-label="pen on desk"
        style={{
          width: `${48 * scale}px`,
          height: `${4 * scale}px`,
          background:
            "linear-gradient(to right, rgba(201, 168, 76, 0.5) 0%, rgba(201, 168, 76, 0.8) 60%, rgba(201, 168, 76, 0.4) 100%)",
          borderRadius: "2px",
          transform: "rotate(-14deg)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: `-${3 * scale}px`,
            top: "50%",
            transform: "translateY(-50%)",
            width: `${4 * scale}px`,
            height: `${2 * scale}px`,
            background: "#F5E8C0",
            borderRadius: "0 1px 1px 0",
          }}
        />
      </div>
    );
  }

  // kind === 'lamp'
  return (
    <div
      role="presentation"
      aria-label="desk lamp"
      style={{
        position: "relative",
        width: `${32 * scale}px`,
        height: `${40 * scale}px`,
      }}
    >
      {/* lamp base */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${18 * scale}px`,
          height: `${4 * scale}px`,
          background: "rgba(201, 168, 76, 0.5)",
          borderRadius: "2px",
        }}
      />
      {/* arm */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: `${4 * scale}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: "1.5px",
          height: `${24 * scale}px`,
          background: "rgba(201, 168, 76, 0.45)",
        }}
      />
      {/* shade */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${16 * scale}px`,
          height: `${10 * scale}px`,
          background: "rgba(201, 168, 76, 0.7)",
          borderRadius: "2px 2px 8px 8px",
          boxShadow: "0 0 14px rgba(201, 168, 76, 0.45)",
          animation: "idle-lamp-flicker 4.2s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes idle-lamp-flicker {
          0%, 100% { opacity: 1; }
          46%      { opacity: 0.92; }
          48%      { opacity: 0.78; }
          50%      { opacity: 0.95; }
          52%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
