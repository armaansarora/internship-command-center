"use client";

import type { JSX } from "react";
import { useActor } from "@xstate/react";
import { cnoCharacterMachine } from "@/lib/agents/cno/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Animation CSS
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes cno-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes cno-lean {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(-4px) rotate(-1deg); }
}
@keyframes cno-think {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(5px); }
}
@keyframes cno-gesture {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(-2deg); }
  75% { transform: translateY(-2px) rotate(1deg); }
}
`;

// ---------------------------------------------------------------------------
// Character SVG silhouette — warm amber/gold scheme
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
          animation: "cno-breathe 4.5s ease-in-out infinite",
        };
      case "alert":
        return {
          transform: "translateX(-4px) rotate(-1deg)",
          transition: "transform 0.2s ease-out",
        };
      case "greeting":
        return {
          animation: "cno-gesture 0.6s ease-in-out",
        };
      case "thinking":
        return {
          animation: "cno-think 2.2s ease-in-out infinite",
        };
      case "talking":
        return {
          animation: "cno-gesture 1.3s ease-in-out infinite",
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
      aria-label="CNO character silhouette"
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
        {/* Warm amber glow filter */}
        <defs>
          <filter id="cno-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cno-glow-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rolodex / desk in background */}
        <rect
          x="8"
          y="50"
          width="144"
          height="90"
          rx="6"
          fill="#231508"
          stroke="#5C3A1E"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Rolodex card stack */}
        <rect x="18" y="60" width="40" height="26" rx="3" fill="#2E1A0A" stroke="#C9A84C" strokeWidth="0.8" opacity="0.7" />
        <rect x="22" y="56" width="40" height="26" rx="3" fill="#2E1A0A" stroke="#D97706" strokeWidth="0.8" opacity="0.5" />
        <rect x="26" y="52" width="40" height="26" rx="3" fill="#2E1A0A" stroke="#E8C87A" strokeWidth="0.8" opacity="0.35" />
        {/* Card lines */}
        <line x1="30" y1="66" x2="52" y2="66" stroke="#C9A84C" strokeWidth="1" opacity="0.6" />
        <line x1="30" y1="72" x2="48" y2="72" stroke="#D97706" strokeWidth="0.8" opacity="0.4" />
        {/* Network nodes on desk */}
        <circle cx="90" cy="75" r="4" fill="#4ADE80" opacity="0.7" filter="url(#cno-glow-soft)" />
        <circle cx="110" cy="80" r="3" fill="#F59E0B" opacity="0.6" filter="url(#cno-glow-soft)" />
        <circle cx="130" cy="70" r="2" fill="#EF4444" opacity="0.5" />
        <line x1="90" y1="75" x2="110" y2="80" stroke="#C9A84C" strokeWidth="0.8" opacity="0.4" />
        <line x1="110" y1="80" x2="130" y2="70" stroke="#C9A84C" strokeWidth="0.8" opacity="0.3" />
        {/* Warmth bar on desk */}
        <rect x="75" y="105" width="65" height="5" rx="2" fill="#231508" opacity="0.8" />
        <rect x="75" y="105" width="40" height="5" rx="2" fill="#C9A84C" opacity="0.6" />

        {/* Figure body — warm amber palette */}
        {/* Legs */}
        <rect
          x="65"
          y="220"
          width="12"
          height="55"
          rx="4"
          fill="#C9A84C"
          opacity={opacity}
          filter="url(#cno-glow)"
        />
        <rect
          x="83"
          y="220"
          width="12"
          height="55"
          rx="4"
          fill="#C9A84C"
          opacity={opacity}
          filter="url(#cno-glow)"
        />

        {/* Torso */}
        <rect
          x="58"
          y="155"
          width="44"
          height="68"
          rx="6"
          fill="#C9A84C"
          opacity={opacity}
          filter="url(#cno-glow)"
        />

        {/* Left arm — gesturing toward rolodex */}
        <rect
          x="22"
          y="162"
          width="38"
          height="10"
          rx="5"
          fill="#C9A84C"
          opacity={opacity}
          filter="url(#cno-glow)"
          transform="rotate(-18 22 167)"
        />

        {/* Right arm */}
        <rect
          x="100"
          y="168"
          width="28"
          height="10"
          rx="5"
          fill="#C9A84C"
          opacity={opacity}
          filter="url(#cno-glow)"
          transform="rotate(12 100 173)"
        />

        {/* Head */}
        <circle
          cx="80"
          cy="138"
          r="18"
          fill="#C9A84C"
          opacity={opacity}
          filter="url(#cno-glow)"
        />

        {/* Eyes — warm */}
        <circle cx="74" cy="136" r="2.5" fill="#FDF3E8" opacity="0.9" />
        <circle cx="86" cy="136" r="2.5" fill="#FDF3E8" opacity="0.9" />

        {/* Alert indicator badge */}
        {(state === "alert" || state === "greeting") && (
          <circle
            cx="98"
            cy="120"
            r="8"
            fill="#EF4444"
            opacity="0.9"
          />
        )}

        {/* Warm glow halo behind head when talking */}
        {(state === "talking" || state === "ready") && (
          <circle
            cx="80"
            cy="138"
            r="26"
            fill="none"
            stroke="#C9A84C"
            strokeWidth="1"
            opacity="0.25"
          />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface CNOCharacterProps {
  onConversationOpen?: () => void;
  coldAlertsCount?: number;
}

export function CNOCharacter({
  onConversationOpen,
  coldAlertsCount = 0,
}: CNOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(cnoCharacterMachine);
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
    idle: "CNO — Click to open networking review",
    alert: "CNO is noticing you — click to talk",
    greeting: "CNO is greeting you",
    ready: "CNO is ready — ask about your network",
    thinking: "CNO is analyzing your contacts",
    talking: "CNO is speaking",
    returning: "CNO is stepping back",
  };

  const hasColdAlerts = coldAlertsCount > 0;

  return (
    <>
      {/* Inject keyframe CSS once */}
      <style>{KEYFRAMES}</style>

      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={stateLabel[currentState] ?? "CNO Character"}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9A84C] rounded-lg"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <CharacterSilhouette
          state={currentState}
          reducedMotion={reducedMotion}
        />

        {/* Cold alert badge */}
        {hasColdAlerts && (
          <span
            aria-label={`${coldAlertsCount} cold contacts need attention`}
            className="absolute top-0 right-0 flex items-center justify-center rounded-full"
            style={{
              width: "20px",
              height: "20px",
              backgroundColor: "#EF4444",
              color: "#FDF3E8",
              fontSize: "10px",
              fontFamily: "IBM Plex Mono, monospace",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {coldAlertsCount}
          </span>
        )}

        {/* Status indicator */}
        <span
          aria-hidden="true"
          className="mt-2 text-xs font-mono tracking-wide uppercase"
          style={{ color: currentState === "idle" ? "#7A5B35" : "#C9A84C" }}
        >
          {currentState === "idle" ? "CNO" : "● CNO"}
        </span>
      </button>
    </>
  );
}
