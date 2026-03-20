"use client";

import type { JSX } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cro/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Animation CSS
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes cro-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes cro-lean {
  0%, 100% { transform: translateX(0) scaleX(1); }
  100% { transform: translateX(-5px) scaleX(1.02); }
}
@keyframes cro-pace {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(4px); }
}
@keyframes cro-gesture {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-4px) rotate(-2deg); }
  75% { transform: translateY(-2px) rotate(1deg); }
}
`;

// ---------------------------------------------------------------------------
// Character SVG silhouette
// ---------------------------------------------------------------------------
function CharacterSilhouette({
  state,
  reducedMotion,
}: {
  state: string;
  reducedMotion: boolean;
}): JSX.Element {
  const animationStyle = (): React.CSSProperties => {
    if (reducedMotion) return {};

    switch (state) {
      case "idle":
        return {
          animation: "cro-breathe 4s ease-in-out infinite",
        };
      case "alert":
        return {
          transform: "translateX(-5px) scaleX(1.02)",
          transition: "transform 0.2s ease-out",
        };
      case "greeting":
        return {
          animation: "cro-gesture 0.6s ease-in-out",
          opacity: 1,
        };
      case "thinking":
        return {
          animation: "cro-pace 2s ease-in-out infinite",
        };
      case "talking":
        return {
          animation: "cro-gesture 1.2s ease-in-out infinite",
        };
      case "returning":
        return {
          opacity: 0.5,
          transition: "opacity 0.4s ease-out",
        };
      default:
        return {};
    }
  };

  const opacity = state === "idle" ? 0.85 : 1;

  return (
    <div
      role="img"
      aria-label="CRO character silhouette"
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
        {/* Glow filter */}
        <defs>
          <filter id="cro-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Whiteboard in background */}
        <rect
          x="10"
          y="40"
          width="140"
          height="100"
          rx="4"
          fill="#0A1628"
          stroke="#1E3A5F"
          strokeWidth="2"
          opacity="0.9"
        />
        {/* Whiteboard lines (data) */}
        <line
          x1="20"
          y1="60"
          x2="140"
          y2="60"
          stroke="#1E90FF"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <line
          x1="20"
          y1="80"
          x2="120"
          y2="80"
          stroke="#00D4FF"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1="20"
          y1="100"
          x2="130"
          y2="100"
          stroke="#1E90FF"
          strokeWidth="1"
          opacity="0.4"
        />
        {/* Pipeline funnel arrow on whiteboard */}
        <polyline
          points="25,120 55,110 85,115 115,105 140,112"
          stroke="#00FF87"
          strokeWidth="2"
          fill="none"
          opacity="0.7"
        />

        {/* Figure body — standing at whiteboard */}
        {/* Legs */}
        <rect
          x="65"
          y="220"
          width="12"
          height="55"
          rx="4"
          fill="#1E90FF"
          opacity={opacity}
          filter="url(#cro-glow)"
        />
        <rect
          x="83"
          y="220"
          width="12"
          height="55"
          rx="4"
          fill="#1E90FF"
          opacity={opacity}
          filter="url(#cro-glow)"
        />

        {/* Torso */}
        <rect
          x="58"
          y="155"
          width="44"
          height="68"
          rx="6"
          fill="#1E90FF"
          opacity={opacity}
          filter="url(#cro-glow)"
        />

        {/* Left arm — pointing at whiteboard */}
        <rect
          x="28"
          y="160"
          width="32"
          height="10"
          rx="5"
          fill="#1E90FF"
          opacity={opacity}
          filter="url(#cro-glow)"
          transform="rotate(-15 28 165)"
        />

        {/* Right arm */}
        <rect
          x="100"
          y="165"
          width="28"
          height="10"
          rx="5"
          fill="#1E90FF"
          opacity={opacity}
          filter="url(#cro-glow)"
          transform="rotate(10 100 170)"
        />

        {/* Head */}
        <circle
          cx="80"
          cy="138"
          r="18"
          fill="#1E90FF"
          opacity={opacity}
          filter="url(#cro-glow)"
        />

        {/* Eyes — subtle */}
        <circle cx="74" cy="136" r="2.5" fill="#E8F4FD" opacity="0.9" />
        <circle cx="86" cy="136" r="2.5" fill="#E8F4FD" opacity="0.9" />

        {/* Alert indicator badge */}
        {(state === "alert" || state === "greeting") && (
          <circle
            cx="98"
            cy="120"
            r="8"
            fill="#F59E0B"
            opacity="0.95"
          />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface CROCharacterProps {
  onConversationOpen?: () => void;
}

export function CROCharacter({ onConversationOpen }: CROCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const reducedMotion = useReducedMotion();

  const currentState = snapshot.value as string;

  function handleClick() {
    send({ type: "CLICK" });
    if (!snapshot.context.isConversationOpen) {
      onConversationOpen?.();
    }
  }

  function handleMouseEnter() {
    send({ type: "HOVER" });
  }

  function handleMouseLeave() {
    send({ type: "LEAVE" });
  }

  const stateLabel: Record<string, string> = {
    idle: "CRO — Click to open pipeline review",
    alert: "CRO is noticing you — click to talk",
    greeting: "CRO is greeting you",
    ready: "CRO is ready — ask about your pipeline",
    thinking: "CRO is analyzing your pipeline",
    talking: "CRO is speaking",
    returning: "CRO is stepping back",
  };

  return (
    <>
      {/* Inject keyframe CSS once */}
      <style>{KEYFRAMES}</style>

      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={stateLabel[currentState] ?? "CRO Character"}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E90FF] rounded-lg"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <CharacterSilhouette
          state={currentState}
          reducedMotion={reducedMotion}
        />

        {/* Status indicator dot */}
        <span
          aria-hidden="true"
          className="mt-2 text-xs font-mono tracking-wide uppercase"
          style={{ color: currentState === "idle" ? "#4A7A9B" : "#1E90FF" }}
        >
          {currentState === "idle" ? "CRO" : "● CRO"}
        </span>
      </button>
    </>
  );
}
