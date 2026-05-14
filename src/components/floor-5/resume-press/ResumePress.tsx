"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type PressPhase = "dormant" | "stamping" | "settled";

export interface ResumePressProps {
  /** Drives the animation. When this flips dormant → stamping the timeline runs; settled remains until flipped back. */
  active: boolean;
  /** Version number to emboss on the stamped chip. */
  versionLabel?: string;
  /** Optional class override. */
  className?: string;
}

const STAMP_DURATION_MS = 1400;

export function ResumePress({
  active,
  versionLabel,
  className,
}: ResumePressProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const [stampSettled, setStampSettled] = useState<boolean>(false);

  useEffect(() => {
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
      <span className="rp-base" aria-hidden="true" />
      <span className="rp-post" aria-hidden="true" />
      <span className="rp-crossbeam" aria-hidden="true" />
      <span className="rp-lever" aria-hidden="true">
        <span className="rp-lever-arm" />
        <span className="rp-lever-knob" />
      </span>
      <span className="rp-head" aria-hidden="true">
        <span className="rp-head-line" />
        <span className="rp-head-line" />
      </span>
      <span className="rp-paper" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {phase === "settled" && versionLabel ? (
        <span className="rp-chip" aria-hidden="true">{versionLabel}</span>
      ) : null}

      <style>{`
        .rp-base {
          position: absolute;
          left: 10px;
          top: 150px;
          width: 160px;
          height: 30px;
          border-radius: 3px;
          border: 1px solid #3A2510;
          background: #2A1C12;
        }
        .rp-post {
          position: absolute;
          left: 25px;
          top: 30px;
          width: 8px;
          height: 130px;
          background: #3A2510;
        }
        .rp-crossbeam {
          position: absolute;
          left: 25px;
          top: 30px;
          width: 130px;
          height: 10px;
          background: #3A2510;
        }
        .rp-lever {
          position: absolute;
          left: 100px;
          top: 18px;
          width: 86px;
          height: 12px;
          transform-origin: 0 3px;
        }
        .rp-lever-arm {
          position: absolute;
          left: 0;
          top: 0;
          width: 80px;
          height: 6px;
          border-radius: 2px;
          background: #C9A84C;
        }
        .rp-lever-knob {
          position: absolute;
          left: 72px;
          top: -3px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid #8F6F2A;
          background: #C9A84C;
        }
        .rp-head {
          position: absolute;
          left: 50px;
          top: 45px;
          width: 80px;
          height: 40px;
          border-radius: 4px;
          border: 1.5px solid #3A2510;
          background: #6B4E24;
          display: grid;
          align-content: center;
          gap: 6px;
          padding: 0 5px;
          box-sizing: border-box;
        }
        .rp-head-line {
          height: 4px;
          background: #8F6F2A;
        }
        .rp-paper {
          position: absolute;
          left: 40px;
          top: 148px;
          width: 100px;
          height: 28px;
          border: 1px solid #B39B75;
          background: #F5E6C8;
          display: grid;
          gap: 5px;
          padding: 5px 6px;
          box-sizing: border-box;
        }
        .rp-paper span {
          height: 1px;
          background: rgba(58, 37, 16, 0.45);
        }
        .rp-paper span:nth-child(2) { width: 80%; }
        .rp-paper span:nth-child(3) { width: 50%; }
        .rp-chip {
          position: absolute;
          left: 130px;
          top: 150px;
          width: 40px;
          height: 16px;
          display: grid;
          place-items: center;
          border-radius: 2px;
          border: 1px solid #8F6F2A;
          background: #C9A84C;
          color: #1A1008;
          font-size: 10px;
          font-weight: 700;
        }
        @keyframes rp-lever-pull {
          0% { transform: rotate(0deg); }
          40%, 55% { transform: rotate(-22deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes rp-head-stamp {
          0% { transform: translateY(0); }
          40%, 55% { transform: translateY(30px); }
          100% { transform: translateY(0); }
        }
        @keyframes rp-paper-slide {
          0%, 50% { transform: translateY(30px); opacity: 0; }
          75% { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes rp-chip-in {
          0% { transform: translateX(30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
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
        [data-reduced-motion="true"] .rp-paper {
          opacity: 1;
          transition: opacity 140ms linear;
        }
      `}</style>
    </div>
  );
}
