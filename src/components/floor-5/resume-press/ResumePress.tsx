"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The Resume Press.
 *
 * A mechanical object at the corner of the Writing Room desk. Sits
 * dormant until a resume tailoring kicks off — then the lever pulls
 * down, the press shakes, an embossed version chip slides in, and
 * paper slips out the front slot. prefers-reduced-motion collapses
 * the whole sequence to an opacity crossfade.
 *
 * Visually signals "this is a physical thing, not a `Generate` button".
 * Per the roadmap's provocations: lever arm, *ka-chunk*, embossed
 * version number.
 *
 * Pure CSS + SVG — no GSAP dependency at this scale keeps the bundle
 * light. Animations driven by data-phase attribute (dormant | stamping
 * | settled) so the parent component has full control.
 */

export type PressPhase = "dormant" | "stamping" | "settled";

export interface ResumePressProps {
  /** Drives the animation. When this flips dormant → stamping the
   *  timeline runs; settled remains until flipped back. */
  active: boolean;
  /** Version number to emboss on the stamped chip. */
  versionLabel?: string;
  /** Optional class override. */
  className?: string;
}

const STAMP_DURATION_MS = 1400; // cold stamp → settled

export function ResumePress({
  active,
  versionLabel,
  className,
}: ResumePressProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  // Derive the initial phase from props so the first render is correct
  // without a synchronous setState inside useEffect (which the React
  // lint rule flags as a cascading-render anti-pattern).
  const [stampSettled, setStampSettled] = useState<boolean>(false);

  useEffect(() => {
    // Animation-state reset is a legitimate synchronous effect pattern
    // (React docs example) — the new `react-hooks/set-state-in-effect`
    // rule is overly strict here, so we disable it for just this block.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!active) {
      setStampSettled(false);
      return;
    }
    if (reducedMotion) {
      setStampSettled(true);
      return;
    }
    setStampSettled(false);
    const t = setTimeout(() => setStampSettled(true), STAMP_DURATION_MS);
    return () => clearTimeout(t);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active, reducedMotion]);

  const phase: PressPhase = !active
    ? "dormant"
    : stampSettled
      ? "settled"
      : "stamping";

  return (
    <div
      aria-label="Resume press — mechanical stamping apparatus"
      role="img"
      data-phase={phase}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      className={className}
      style={{
        position: "relative",
        width: 180,
        height: 200,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <svg
        viewBox="0 0 180 200"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Base plate */}
        <rect
          x="10"
          y="150"
          width="160"
          height="30"
          rx="3"
          fill="#2A1C12"
          stroke="#3A2510"
          strokeWidth="1"
        />
        {/* Back post */}
        <rect
          x="25"
          y="30"
          width="8"
          height="130"
          fill="#3A2510"
        />
        {/* Cross beam */}
        <rect
          x="25"
          y="30"
          width="130"
          height="10"
          fill="#3A2510"
        />
        {/* Lever arm — animated */}
        <g className="rp-lever">
          <rect
            x="100"
            y="18"
            width="80"
            height="6"
            rx="2"
            fill="#C9A84C"
          />
          <circle cx="178" cy="21" r="6" fill="#C9A84C" stroke="#8F6F2A" />
        </g>
        {/* Press head — animated */}
        <g className="rp-head">
          <rect
            x="50"
            y="45"
            width="80"
            height="40"
            rx="4"
            fill="#6B4E24"
            stroke="#3A2510"
            strokeWidth="1.5"
          />
          <rect
            x="55"
            y="55"
            width="70"
            height="4"
            fill="#8F6F2A"
          />
          <rect
            x="55"
            y="65"
            width="70"
            height="4"
            fill="#8F6F2A"
          />
        </g>
        {/* Paper emerging — animated */}
        <g className="rp-paper">
          <rect
            x="40"
            y="148"
            width="100"
            height="28"
            fill="#F5E6C8"
            stroke="#B39B75"
            strokeWidth="0.5"
          />
          <rect
            x="46"
            y="152"
            width="60"
            height="1.2"
            fill="#3A2510"
            opacity="0.5"
          />
          <rect
            x="46"
            y="158"
            width="80"
            height="1.2"
            fill="#3A2510"
            opacity="0.4"
          />
          <rect
            x="46"
            y="164"
            width="50"
            height="1.2"
            fill="#3A2510"
            opacity="0.3"
          />
        </g>
        {/* Version chip — only renders on settled */}
        {phase === "settled" && versionLabel ? (
          <g className="rp-chip">
            <rect
              x="130"
              y="150"
              width="40"
              height="16"
              rx="2"
              fill="#C9A84C"
              stroke="#8F6F2A"
              strokeWidth="0.8"
            />
            <text
              x="150"
              y="161"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              fill="#1A1008"
              fontFamily="'JetBrains Mono', monospace"
            >
              {versionLabel}
            </text>
          </g>
        ) : null}
      </svg>

      <style>{`
        @keyframes rp-lever-pull {
          0%   { transform: rotate(0deg); transform-origin: 100px 21px; }
          40%  { transform: rotate(-22deg); transform-origin: 100px 21px; }
          55%  { transform: rotate(-22deg); transform-origin: 100px 21px; }
          100% { transform: rotate(0deg); transform-origin: 100px 21px; }
        }
        @keyframes rp-head-stamp {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(30px); }
          55%  { transform: translateY(30px); }
          100% { transform: translateY(0); }
        }
        @keyframes rp-paper-slide {
          0%   { transform: translateY(30px); opacity: 0; }
          50%  { transform: translateY(30px); opacity: 0; }
          75%  { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes rp-chip-in {
          0%   { transform: translateX(30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        [data-phase="dormant"] .rp-lever,
        [data-phase="dormant"] .rp-head,
        [data-phase="dormant"] .rp-paper,
        [data-phase="dormant"] .rp-chip {
          transform: none;
        }
        [data-phase="dormant"] .rp-paper {
          opacity: 0;
        }

        [data-phase="stamping"][data-reduced-motion="false"] .rp-lever {
          animation: rp-lever-pull ${STAMP_DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }
        [data-phase="stamping"][data-reduced-motion="false"] .rp-head {
          animation: rp-head-stamp ${STAMP_DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }
        [data-phase="stamping"][data-reduced-motion="false"] .rp-paper {
          animation: rp-paper-slide ${STAMP_DURATION_MS}ms ease-out forwards;
        }

        [data-phase="settled"] .rp-paper {
          opacity: 1;
        }
        [data-phase="settled"][data-reduced-motion="false"] .rp-chip {
          animation: rp-chip-in 260ms ease-out forwards;
        }

        /* Reduced motion: hard-swap to final state without motion */
        [data-reduced-motion="true"] .rp-paper {
          opacity: 1;
          transition: opacity 140ms linear;
        }
      `}</style>
    </div>
  );
}
