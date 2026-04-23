"use client";

import type { JSX } from "react";

/**
 * OtisAvatar — the Concierge's standing silhouette behind a reception desk.
 *
 * Deliberately distinct from every C-suite character sheet:
 *   • palette is burgundy (#6B2A2E / #3D1618), never the C-suite gold.
 *   • posture is "standing at reception," not pacing an executive room.
 *   • the desk carries a guest book and a small brass bell — warmth, not
 *     command. He is the first human surface of the building.
 *
 * Animation is delegated to the parent (`OtisCharacter`) via CSS keyframes
 * so the avatar stays a pure presentation layer.
 */

type OtisMood = "idle" | "greeting" | "listening" | "thinking" | "talking";

const BURGUNDY = "#6B2A2E";
const BURGUNDY_DEEP = "#3D1618";
const BURGUNDY_SOFT = "rgba(107, 42, 46, 0.85)";
const IVORY = "#F5EEE1";
const BRASS = "#B07A1E";

export function OtisAvatar({ mood }: { mood: OtisMood }): JSX.Element {
  const torsoOpacity = mood === "idle" ? 0.94 : 1;

  return (
    <div role="img" aria-label="Otis, the Concierge, standing at the reception desk" style={{ display: "inline-block" }}>
      <svg
        width="170"
        height="290"
        viewBox="0 0 170 290"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="otis-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="otis-desk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BURGUNDY_DEEP} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#220B0C" stopOpacity="0.98" />
          </linearGradient>
          <radialGradient id="otis-bell" cx="0.5" cy="0.4" r="0.55">
            <stop offset="0%" stopColor="#E6B85C" />
            <stop offset="70%" stopColor={BRASS} />
            <stop offset="100%" stopColor="#5A3C0A" />
          </radialGradient>
        </defs>

        {/* Reception desk (front face) — dark burgundy, inlay seam */}
        <rect x="10" y="210" width="150" height="70" rx="3" fill="url(#otis-desk)" />
        <rect x="10" y="210" width="150" height="3" fill={BURGUNDY_SOFT} opacity="0.7" />
        <rect x="10" y="270" width="150" height="1.5" fill={BURGUNDY_SOFT} opacity="0.35" />

        {/* Guest book — left of center on the desk */}
        <rect x="24" y="198" width="36" height="14" rx="1" fill="#1A0D0E" stroke={IVORY} strokeOpacity="0.12" />
        <rect x="28" y="200" width="28" height="9" fill={IVORY} opacity="0.08" />
        <line x1="42" y1="198" x2="42" y2="212" stroke={BURGUNDY_SOFT} strokeWidth="0.5" opacity="0.6" />

        {/* Brass reception bell — right of guest book */}
        <path d="M 94 198 Q 94 184 104 184 Q 114 184 114 198 L 114 200 L 94 200 Z" fill="url(#otis-bell)" />
        <rect x="92" y="200" width="24" height="2.5" rx="1" fill={BRASS} />
        <circle cx="104" cy="186" r="1.8" fill="#FFE39E" opacity="0.9" />

        {/* Subtle desk lamp light spill behind Otis (not on him) */}
        <ellipse cx="85" cy="206" rx="60" ry="5" fill={BRASS} opacity="0.08" />

        {/* ------ Otis figure ------ */}
        {/* Body shadow on desk */}
        <ellipse cx="85" cy="208" rx="32" ry="3" fill="#000" opacity="0.25" />

        {/* Torso — concierge vest (not executive suit) */}
        <path
          d="M 60 132 L 110 132 L 114 196 L 56 196 Z"
          fill={BURGUNDY}
          opacity={torsoOpacity}
          filter="url(#otis-glow)"
        />
        {/* Vest front seam + buttons */}
        <line x1="85" y1="134" x2="85" y2="196" stroke={IVORY} strokeOpacity="0.35" strokeWidth="0.8" />
        <circle cx="85" cy="150" r="1.5" fill={BRASS} />
        <circle cx="85" cy="166" r="1.5" fill={BRASS} />
        <circle cx="85" cy="182" r="1.5" fill={BRASS} />

        {/* Shirt collar — ivory, lapel V */}
        <path
          d="M 76 132 L 85 148 L 94 132 Z"
          fill={IVORY}
          opacity="0.85"
        />

        {/* Bow tie — small burgundy wings */}
        <path
          d="M 82 144 L 78 141 L 78 147 Z M 88 144 L 92 141 L 92 147 Z"
          fill={BURGUNDY_DEEP}
        />
        <circle cx="85" cy="144" r="1.2" fill={BRASS} />

        {/* Arms — resting at the desk, not gesturing (warm but composed) */}
        <rect
          x="48"
          y="140"
          width="14"
          height="52"
          rx="5"
          fill={BURGUNDY}
          opacity={torsoOpacity}
          filter="url(#otis-glow)"
        />
        <rect
          x="108"
          y="140"
          width="14"
          height="52"
          rx="5"
          fill={BURGUNDY}
          opacity={torsoOpacity}
          filter="url(#otis-glow)"
        />
        {/* Hands — just-visible at desk level */}
        <circle cx="55" cy="200" r="4" fill={IVORY} opacity="0.82" />
        <circle cx="115" cy="200" r="4" fill={IVORY} opacity="0.82" />

        {/* Head — softer, not commanding */}
        <circle cx="85" cy="115" r="17" fill={BURGUNDY_SOFT} opacity={torsoOpacity} filter="url(#otis-glow)" />
        {/* Hair — a simple side-parted top */}
        <path
          d="M 70 107 Q 80 98 100 105 L 100 112 L 70 112 Z"
          fill={BURGUNDY_DEEP}
          opacity="0.9"
        />

        {/* Eyes — warm, attentive, not piercing */}
        <circle cx="80" cy="115" r="1.8" fill={IVORY} opacity="0.95" />
        <circle cx="91" cy="115" r="1.8" fill={IVORY} opacity="0.95" />

        {/* Mouth — faint smile line when greeting/talking */}
        {(mood === "greeting" || mood === "talking") && (
          <path d="M 80 122 Q 85 125 91 122" stroke={IVORY} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.85" />
        )}

        {/* "Attending" cue — a small brass pin on the lapel when listening */}
        {mood === "listening" && (
          <circle cx="92" cy="142" r="2.2" fill={BRASS} opacity="0.95">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}

        {/* "Thinking" cue — a subtle dot over the shoulder when Claude is composing */}
        {mood === "thinking" && (
          <>
            <circle cx="130" cy="108" r="2" fill={BRASS} opacity="0.8">
              <animate attributeName="cy" values="108;104;108" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="137" cy="108" r="2" fill={BRASS} opacity="0.6">
              <animate attributeName="cy" values="108;104;108" dur="1.6s" begin="0.25s" repeatCount="indefinite" />
            </circle>
            <circle cx="144" cy="108" r="2" fill={BRASS} opacity="0.4">
              <animate attributeName="cy" values="108;104;108" dur="1.6s" begin="0.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
    </div>
  );
}
