"use client";

import type { JSX } from "react";
import { useEffect, useCallback } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cpo/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------
type CPOState =
  | "idle"
  | "alert"
  | "greeting"
  | "ready"
  | "talking"
  | "thinking"
  | "briefing"
  | "returning";

// ---------------------------------------------------------------------------
// Animation CSS keyframes
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes cpo-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes cpo-scan {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-4px) rotate(-1deg); }
  75% { transform: translateX(2px) rotate(0.5deg); }
}
@keyframes cpo-think {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-3px) rotate(-1.5deg); }
  66% { transform: translateY(-1px) rotate(1deg); }
}
@keyframes cpo-present {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-4px) rotate(-2deg); }
  50% { transform: translateY(-2px) rotate(0deg); }
  75% { transform: translateY(-5px) rotate(-1.5deg); }
}
@keyframes cpo-engage {
  0%, 100% { transform: scaleX(1) translateX(0); }
  50% { transform: scaleX(1.02) translateX(-3px); }
}
@keyframes cpo-pointer-point {
  0%, 100% { transform: rotate(-15deg); }
  50% { transform: rotate(-25deg) translateX(-4px); }
}
`;

// ---------------------------------------------------------------------------
// Character SVG silhouette — methodical, military-precision CPO
// ---------------------------------------------------------------------------
function CPOSilhouette({
  state,
  reducedMotion,
}: {
  state: CPOState;
  reducedMotion: boolean;
}): JSX.Element {
  const animationStyle = (): React.CSSProperties => {
    if (reducedMotion) return {};

    switch (state) {
      case "idle":
      case "ready":
        return {
          animation: "cpo-breathe 5s ease-in-out infinite",
        };
      case "alert":
        return {
          animation: "cpo-scan 1.8s ease-in-out infinite",
        };
      case "talking":
        return {
          animation: "cpo-engage 2s ease-in-out infinite",
        };
      case "thinking":
        return {
          animation: "cpo-think 3s ease-in-out infinite",
        };
      case "briefing":
        return {
          animation: "cpo-present 2.5s ease-in-out infinite",
        };
      case "returning":
        return {
          opacity: 0.5,
          transition: "opacity 0.3s ease-out",
        };
      default:
        return {};
    }
  };

  const bodyOpacity = state === "idle" ? 0.82 : 1;

  // Pointer arm: animated when briefing
  const pointerArmStyle: React.CSSProperties =
    !reducedMotion && state === "briefing"
      ? { animation: "cpo-pointer-point 1.8s ease-in-out infinite" }
      : {};

  return (
    <div
      role="img"
      aria-label="CPO character silhouette"
      style={{ display: "inline-block", ...animationStyle() }}
    >
      <svg
        width="160"
        height="280"
        viewBox="0 0 160 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Sharp clinical glow — cool blue */}
          <filter id="cpo-glow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle inner glow for whiteboard */}
          <filter id="cpo-board-glow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Podium / Lectern ── */}
        <rect
          x="55"
          y="220"
          width="50"
          height="52"
          rx="2"
          fill="#0D1524"
          stroke="#1A2E4A"
          strokeWidth="1.5"
          opacity="0.95"
        />
        {/* Podium front panel */}
        <rect
          x="62"
          y="228"
          width="36"
          height="28"
          rx="1"
          fill="#111C2E"
          stroke="#4A9EDB"
          strokeWidth="0.8"
          opacity="0.7"
        />
        {/* Podium indicator LEDs */}
        <circle cx="72" cy="238" r="2" fill="#00E5FF" opacity="0.8" />
        <circle cx="80" cy="238" r="2" fill="#4A9EDB" opacity="0.5" />
        <circle cx="88" cy="238" r="2" fill="#4A9EDB" opacity="0.3" />

        {/* ── Whiteboard behind figure ── */}
        <rect
          x="8"
          y="30"
          width="144"
          height="115"
          rx="3"
          fill="#090F1C"
          stroke="#1A2E4A"
          strokeWidth="1.5"
          opacity="0.92"
          filter="url(#cpo-board-glow)"
        />
        {/* Whiteboard frame — top accent */}
        <line
          x1="8"
          y1="30"
          x2="152"
          y2="30"
          stroke="#4A9EDB"
          strokeWidth="1.5"
          opacity="0.5"
        />
        {/* Whiteboard header text simulation */}
        <rect x="18" y="38" width="60" height="4" rx="1" fill="#4A9EDB" opacity="0.22" />
        <rect x="84" y="38" width="40" height="4" rx="1" fill="#7EC8E3" opacity="0.18" />

        {/* Whiteboard content lines */}
        <line x1="18" y1="52" x2="142" y2="52" stroke="#4A9EDB" strokeWidth="1" opacity="0.35" />
        <line x1="18" y1="65" x2="128" y2="65" stroke="#7EC8E3" strokeWidth="0.8" opacity="0.28" />
        <line x1="18" y1="78" x2="136" y2="78" stroke="#4A9EDB" strokeWidth="0.8" opacity="0.22" />
        <line x1="18" y1="91" x2="110" y2="91" stroke="#7EC8E3" strokeWidth="0.8" opacity="0.2" />

        {/* Interview prep chart — bar graph */}
        <rect x="22" y="108" width="10" height="22" rx="1" fill="#4A9EDB" opacity="0.55" />
        <rect x="36" y="100" width="10" height="30" rx="1" fill="#7EC8E3" opacity="0.45" />
        <rect x="50" y="113" width="10" height="17" rx="1" fill="#4A9EDB" opacity="0.40" />
        <rect x="64" y="95"  width="10" height="35" rx="1" fill="#00E5FF" opacity="0.60" />
        <rect x="78" y="106" width="10" height="24" rx="1" fill="#4A9EDB" opacity="0.42" />
        <rect x="92" y="110" width="10" height="20" rx="1" fill="#7EC8E3" opacity="0.38" />

        {/* Coverage % annotation */}
        <text x="110" y="110" fontSize="8" fill="#4A9EDB" opacity="0.55"
          fontFamily="monospace">67%</text>

        {/* ── Figure — standing at podium ── */}
        {/* Legs */}
        <rect
          x="68"
          y="198"
          width="11"
          height="24"
          rx="3"
          fill="#4A9EDB"
          opacity={bodyOpacity}
          filter="url(#cpo-glow)"
        />
        <rect
          x="82"
          y="198"
          width="11"
          height="24"
          rx="3"
          fill="#4A9EDB"
          opacity={bodyOpacity}
          filter="url(#cpo-glow)"
        />

        {/* Torso — formal, upright posture */}
        <rect
          x="61"
          y="150"
          width="38"
          height="50"
          rx="4"
          fill="#4A9EDB"
          opacity={bodyOpacity}
          filter="url(#cpo-glow)"
        />

        {/* Jacket lapels — precision detail */}
        <path
          d="M 70 152 L 78 165 L 80 165 L 88 152"
          stroke="#0D1524"
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />

        {/* Left arm — pointing at whiteboard (pointer arm) */}
        <g style={pointerArmStyle} transform-origin="75 158">
          <rect
            x="28"
            y="152"
            width="35"
            height="9"
            rx="4"
            fill="#4A9EDB"
            opacity={bodyOpacity}
            filter="url(#cpo-glow)"
            transform="rotate(-15 28 158)"
          />
          {/* Pointer / laser pointer */}
          {(state === "briefing" || state === "talking") && (
            <rect
              x="12"
              y="147"
              width="18"
              height="3"
              rx="1.5"
              fill="#00E5FF"
              opacity="0.75"
              transform="rotate(-15 12 148)"
            />
          )}
        </g>

        {/* Right arm — down or gesturing */}
        <rect
          x="97"
          y="158"
          width="28"
          height="9"
          rx="4"
          fill="#4A9EDB"
          opacity={bodyOpacity}
          filter="url(#cpo-glow)"
          transform={state === "thinking" ? "rotate(20 97 163)" : "rotate(8 97 163)"}
        />

        {/* Head — clean-cut, precise */}
        <circle
          cx="80"
          cy="135"
          r="16"
          fill="#4A9EDB"
          opacity={bodyOpacity}
          filter="url(#cpo-glow)"
        />

        {/* Hair — short, military-cut */}
        <path
          d="M 66 128 Q 80 119 94 128"
          fill="#2D5E87"
          opacity={bodyOpacity * 0.9}
        />

        {/* Eyes — sharp, direct */}
        <circle cx="74" cy="134" r="2" fill="#E8F4FD" opacity="0.95" />
        <circle cx="86" cy="134" r="2" fill="#E8F4FD" opacity="0.95" />
        {/* Eye pupils */}
        <circle cx="74.5" cy="134.5" r="1" fill="#0D1524" opacity="0.8" />
        <circle cx="86.5" cy="134.5" r="1" fill="#0D1524" opacity="0.8" />

        {/* Mouth — slight firm expression */}
        <line
          x1="76"
          y1="141"
          x2="84"
          y2="141"
          stroke="#E8F4FD"
          strokeWidth="0.8"
          opacity={state === "talking" ? "0.8" : "0.4"}
          strokeLinecap="round"
        />

        {/* Alert indicator */}
        {state === "alert" && (
          <circle
            cx="96"
            cy="118"
            r="7"
            fill="#F59E0B"
            opacity="0.92"
          />
        )}

        {/* Thinking indicator — thought bubble dots */}
        {state === "thinking" && (
          <>
            <circle cx="98" cy="122" r="2.5" fill="#7EC8E3" opacity="0.7" />
            <circle cx="105" cy="115" r="3.5" fill="#7EC8E3" opacity="0.55" />
            <circle cx="112" cy="108" r="4.5" fill="#7EC8E3" opacity="0.4" />
          </>
        )}

        {/* Briefing indicator — presentation pointer glow */}
        {state === "briefing" && (
          <circle
            cx="15"
            cy="143"
            r="3"
            fill="#00E5FF"
            opacity="0.85"
            style={{ filter: "url(#cpo-glow)" }}
          />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface CPOCharacterProps {
  onConversationOpen?: () => void;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CPOCharacter({
  onConversationOpen,
  dialogueOpen,
  dialogueStatus,
}: CPOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const reducedMotion = useReducedMotion();
  const state = snapshot.value as CPOState;

  useEffect(() => {
    if (dialogueOpen === false && snapshot.context.isConversationOpen) {
      send({ type: "DISMISS" });
    }
  }, [dialogueOpen, send, snapshot.context.isConversationOpen]);

  useEffect(() => {
    if (!dialogueOpen || !dialogueStatus) {
      return;
    }
    if (dialogueStatus === "thinking") {
      send({ type: "START_THINKING" });
      return;
    }
    if (dialogueStatus === "talking") {
      send({ type: "START_TALKING" });
      return;
    }
    send({ type: "STOP_BRIEFING" });
    send({ type: "STOP_TALKING" });
  }, [dialogueOpen, dialogueStatus, send]);

  const handleClick = useCallback(() => {
    send({ type: "CLICK" });
    if (!snapshot.context.isConversationOpen) {
      onConversationOpen?.();
    }
  }, [onConversationOpen, send, snapshot.context.isConversationOpen]);

  const handleMouseEnter = useCallback(() => {
    send({ type: "HOVER" });
  }, [send]);

  const handleMouseLeave = useCallback(() => {
    send({ type: "LEAVE" });
  }, [send]);

  const stateLabel: Record<CPOState, string> = {
    idle: "CPO — Click to open interview briefing",
    alert: "CPO noticed you — click to talk",
    greeting: "CPO is greeting you",
    ready: "CPO is ready for your next prep request",
    talking: "CPO is speaking",
    thinking: "CPO is analyzing your prep",
    briefing: "CPO is presenting interview prep",
    returning: "CPO is stepping back",
  };

  return (
    <>
      <style>{KEYFRAMES}</style>

      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={stateLabel[state]}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4A9EDB] rounded-sm"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <CPOSilhouette state={state} reducedMotion={reducedMotion} />

        {/* Status label */}
        <span
          aria-hidden="true"
          className="mt-2 text-xs tracking-wide uppercase"
          style={{
            fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
            color:
              state === "idle"
                ? "#4A6A85"
                : state === "briefing"
                ? "#00E5FF"
                : "#4A9EDB",
          }}
        >
          {state === "idle" ? "CPO" : `● CPO`}
        </span>
      </button>
    </>
  );
}
