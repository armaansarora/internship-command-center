"use client";

import type { JSX } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cro/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Character state types
// ---------------------------------------------------------------------------
type CMOState =
  | "idle"
  | "alert"
  | "greeting"
  | "ready"
  | "thinking"
  | "talking"
  | "writing"
  | "returning";

// ---------------------------------------------------------------------------
// Animation CSS
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes cmo-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes cmo-think {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  30% { transform: translateX(-3px) rotate(-1deg); }
  70% { transform: translateX(2px) rotate(0.5deg); }
}
@keyframes cmo-write {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  20% { transform: translateY(1px) rotate(-1.5deg); }
  40% { transform: translateY(-1px) rotate(1deg); }
  60% { transform: translateY(1px) rotate(-1deg); }
  80% { transform: translateY(0px) rotate(0.5deg); }
}
@keyframes cmo-pen-move {
  0%, 100% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(4px) translateY(2px); }
  50% { transform: translateX(8px) translateY(0); }
  75% { transform: translateX(12px) translateY(1px); }
}
@keyframes cmo-gesture {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(-2deg); }
  75% { transform: translateY(-2px) rotate(1.5deg); }
}
@keyframes cmo-look-up {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-8deg) translateX(-3px); }
}
@keyframes ink-drip {
  0%, 85%, 100% { opacity: 0; transform: translateY(0); }
  87% { opacity: 0.6; }
  95% { opacity: 0.3; transform: translateY(4px); }
}
`;

// ---------------------------------------------------------------------------
// Pen animation (for "writing" state)
// ---------------------------------------------------------------------------
function PenAnimation({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }): JSX.Element {
  if (!active) return <></>;

  return (
    <g
      style={{
        animation: reducedMotion
          ? undefined
          : "cmo-pen-move 0.8s ease-in-out infinite",
        transformOrigin: "75px 238px",
      }}
    >
      {/* Fountain pen body */}
      <rect
        x="68"
        y="228"
        width="16"
        height="4"
        rx="2"
        fill="#C9A84C"
        opacity="0.9"
        transform="rotate(-30 68 230)"
      />
      {/* Pen nib */}
      <polygon
        points="62,240 66,238 64,244"
        fill="#E8A020"
        opacity="0.85"
      />
      {/* Ink trail */}
      <path
        d="M64 244 Q70 248 80 246 Q88 244 94 248"
        stroke="#1A1008"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
        strokeDasharray="3 2"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Character SVG silhouette — creative writer at a desk
// ---------------------------------------------------------------------------
function CharacterSilhouette({
  state,
  reducedMotion,
}: {
  state: CMOState;
  reducedMotion: boolean;
}): JSX.Element {
  const animationStyle = (): React.CSSProperties => {
    if (reducedMotion) return {};

    switch (state) {
      case "idle":
        return {
          animation: "cmo-breathe 4.5s ease-in-out infinite",
        };
      case "alert":
        return {
          transform: "translateX(-3px) translateY(-4px)",
          transition: "transform 0.25s ease-out",
        };
      case "greeting":
        return {
          animation: "cmo-gesture 0.7s ease-in-out",
        };
      case "thinking":
        return {
          animation: "cmo-think 2.2s ease-in-out infinite",
        };
      case "talking":
        return {
          animation: "cmo-gesture 1.4s ease-in-out infinite",
        };
      case "writing":
        return {
          animation: "cmo-write 0.8s ease-in-out infinite",
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

  const bodyOpacity = state === "idle" ? 0.82 : 1.0;
  const isWriting = state === "writing";
  const isThinking = state === "thinking";

  return (
    <div
      role="img"
      aria-label="CMO character — creative writer at desk"
      style={{ display: "inline-block", ...animationStyle() }}
    >
      <svg
        width="200"
        height="300"
        viewBox="0 0 200 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ── Filters ── */}
        <defs>
          <filter id="cmo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cmo-warm-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Desk lamp glow (ambient warmth behind figure) ── */}
        <ellipse
          cx="150"
          cy="90"
          rx="45"
          ry="35"
          fill="rgba(232,160,32,0.06)"
          filter="url(#cmo-warm-glow)"
        />

        {/* ── Writing desk ── */}
        {/* Desk surface */}
        <rect
          x="10"
          y="240"
          width="180"
          height="12"
          rx="2"
          fill="#3A2510"
          opacity="0.9"
        />
        {/* Desk legs */}
        <rect x="18" y="252" width="8" height="28" rx="2" fill="#2A1C12" opacity="0.7" />
        <rect x="174" y="252" width="8" height="28" rx="2" fill="#2A1C12" opacity="0.7" />

        {/* ── Desk lamp ── */}
        <line x1="145" y1="240" x2="150" y2="195" stroke="#5A3E20" strokeWidth="2.5" />
        <ellipse cx="150" cy="188" rx="20" ry="8" fill="#4A2F1E" stroke="#C9A84C" strokeWidth="1" opacity="0.9" />
        {/* Lamp light cone */}
        <path
          d="M135 195 Q150 225 165 195"
          fill="rgba(232,160,32,0.04)"
        />

        {/* ── Ink bottle ── */}
        <rect x="140" y="225" width="12" height="14" rx="2" fill="#1A1008" stroke="#C9A84C" strokeWidth="1" opacity="0.8" />
        <rect x="143" y="222" width="6" height="4" rx="1" fill="#2A1C12" stroke="#C9A84C" strokeWidth="0.75" opacity="0.7" />
        <ellipse cx="146" cy="230" rx="4" ry="5" fill="#4A2F1E" opacity="0.5" />

        {/* ── Scattered draft pages on desk ── */}
        {/* Page 1 — front */}
        <rect
          x="25"
          y="218"
          width="70"
          height="22"
          rx="1"
          fill="#F5E6C8"
          opacity="0.07"
          transform="rotate(-3 25 218)"
        />
        {/* Page 1 ruled lines */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="30"
            y1={222 + i * 4}
            x2="85"
            y2={222 + i * 4}
            stroke="#C9A84C"
            strokeWidth="0.5"
            opacity="0.12"
          />
        ))}
        {/* Page 2 — slightly behind */}
        <rect
          x="30"
          y="215"
          width="65"
          height="22"
          rx="1"
          fill="#F5E6C8"
          opacity="0.04"
          transform="rotate(4 30 215)"
        />

        {/* ── Active writing page (main document) ── */}
        <rect
          x="55"
          y="195"
          width="80"
          height="46"
          rx="2"
          fill="#F5E6C8"
          opacity="0.06"
        />
        {/* Ruled lines on active page */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1="60"
            y1={200 + i * 6}
            x2="125"
            y2={200 + i * 6}
            stroke="#C9A84C"
            strokeWidth="0.5"
            opacity={i === 5 ? "0.06" : "0.10"}
          />
        ))}
        {/* Page margin rule (red line) */}
        <line x1="70" y1="196" x2="70" y2="240" stroke="rgba(180,60,60,0.15)" strokeWidth="0.75" />

        {/* ── Figure body — seated at desk ── */}
        {/* Legs */}
        <rect x="76" y="215" width="13" height="25" rx="4" fill="#C9A84C" opacity={bodyOpacity} filter="url(#cmo-glow)" />
        <rect x="95" y="215" width="13" height="25" rx="4" fill="#C9A84C" opacity={bodyOpacity} filter="url(#cmo-glow)" />

        {/* Torso — leaning forward slightly */}
        <rect
          x="68"
          y="155"
          width="48"
          height="62"
          rx="7"
          fill="#C9A84C"
          opacity={bodyOpacity}
          filter="url(#cmo-glow)"
          transform="rotate(-3 92 186)"
        />

        {/* Left arm — resting on desk / writing */}
        <rect
          x="34"
          y="185"
          width="38"
          height="10"
          rx="5"
          fill="#C9A84C"
          opacity={bodyOpacity}
          filter="url(#cmo-glow)"
          transform="rotate(18 34 190)"
          style={{
            animation: isWriting && !reducedMotion
              ? "cmo-pen-move 0.8s ease-in-out infinite"
              : undefined,
          }}
        />

        {/* Right arm — hand on chin if thinking, else down */}
        <rect
          x="112"
          y={isThinking ? "155" : "175"}
          width="36"
          height="10"
          rx="5"
          fill="#C9A84C"
          opacity={bodyOpacity}
          filter="url(#cmo-glow)"
          transform={isThinking ? "rotate(-45 112 160)" : "rotate(12 112 180)"}
          style={{
            transition: reducedMotion ? undefined : "all 0.3s ease",
          }}
        />

        {/* Head */}
        <ellipse
          cx="92"
          cy="138"
          rx="19"
          ry="21"
          fill="#C9A84C"
          opacity={bodyOpacity}
          filter="url(#cmo-glow)"
          transform={state === "alert" ? "rotate(-12 92 138)" : ""}
          style={{
            transition: reducedMotion ? undefined : "transform 0.2s ease",
          }}
        />

        {/* Eyes */}
        <circle cx="85" cy="135" r="2.5" fill="#F5E6C8" opacity="0.9" />
        <circle cx="99" cy="135" r="2.5" fill="#F5E6C8" opacity="0.9" />

        {/* Glasses — creative type */}
        <path
          d="M80 133 Q85 130 90 133 Q85 136 80 133Z"
          fill="none"
          stroke="#3A2510"
          strokeWidth="1"
          opacity="0.6"
        />
        <path
          d="M94 133 Q99 130 104 133 Q99 136 94 133Z"
          fill="none"
          stroke="#3A2510"
          strokeWidth="1"
          opacity="0.6"
        />
        <line x1="90" y1="133" x2="94" y2="133" stroke="#3A2510" strokeWidth="1" opacity="0.5" />

        {/* Hair / bun — distinctive feature */}
        <ellipse
          cx="92"
          cy="119"
          rx="16"
          ry="10"
          fill="#7A5C3A"
          opacity="0.7"
          filter="url(#cmo-glow)"
        />
        <circle cx="100" cy="114" r="6" fill="#7A5C3A" opacity="0.6" />

        {/* Alert indicator — looks up from writing */}
        {(state === "alert" || state === "greeting") && (
          <circle
            cx="110"
            cy="118"
            r="8"
            fill="#E8A020"
            opacity="0.9"
          />
        )}

        {/* Pen in hand (always present, animated when writing) */}
        <PenAnimation active={isWriting} reducedMotion={reducedMotion} />
        {!isWriting && (
          <g>
            {/* Static pen resting */}
            <rect
              x="50"
              y="226"
              width="20"
              height="3"
              rx="1.5"
              fill="#C9A84C"
              opacity="0.55"
              transform="rotate(-20 50 228)"
            />
            <polygon
              points="44,234 48,232 46,238"
              fill="#E8A020"
              opacity="0.5"
            />
          </g>
        )}

        {/* ── Desk glow under lamp ── */}
        <ellipse
          cx="100"
          cy="242"
          rx="50"
          ry="6"
          fill="rgba(232,160,32,0.04)"
          filter="url(#cmo-warm-glow)"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CMOCharacterProps {
  onConversationOpen?: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CMOCharacter({ onConversationOpen }: CMOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const reducedMotion = useReducedMotion();

  const currentState = snapshot.value as CMOState;

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
    idle: "CMO — Click to open cover letter studio",
    alert: "CMO noticed you — click to start writing",
    greeting: "CMO is greeting you",
    ready: "CMO is ready — let's craft your letter",
    thinking: "CMO is thinking about your application",
    talking: "CMO is speaking",
    writing: "CMO is actively drafting",
    returning: "CMO is returning to work",
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
        aria-label={stateLabel[currentState] ?? "CMO Character"}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg"
        style={{
          WebkitTapHighlightColor: "transparent",
          outlineColor: "#C9A84C",
        }}
      >
        <CharacterSilhouette
          state={currentState}
          reducedMotion={reducedMotion}
        />

        {/* Status indicator dot */}
        <span
          aria-hidden="true"
          className="mt-1 text-xs font-mono tracking-wide uppercase"
          style={{
            color: currentState === "idle" ? "#5A3E20" : "#C9A84C",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {currentState === "idle" ? "CMO" : "● CMO"}
        </span>
      </button>
    </>
  );
}
