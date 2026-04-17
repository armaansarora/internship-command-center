"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cfo/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Animation keyframes (injected inline)
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes cfo-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes cfo-lean {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-4px); }
}
@keyframes cfo-analyze {
  0%, 100% { transform: translateX(0) scaleX(1); }
  30% { transform: translateX(-3px) scaleX(1.01); }
  70% { transform: translateX(2px) scaleX(0.99); }
}
@keyframes cfo-gesture {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-4px) rotate(-2deg); }
  75% { transform: translateY(-2px) rotate(1deg); }
}
`;

// ---------------------------------------------------------------------------
// CFO Character SVG
// ---------------------------------------------------------------------------
function CFOSilhouette({
  state,
  reducedMotion,
}: {
  state: string;
  reducedMotion: boolean;
}): JSX.Element {
  const animStyle = (): React.CSSProperties => {
    if (reducedMotion) return {};
    switch (state) {
      case "idle":      return { animation: "cfo-breathe 4.5s ease-in-out infinite" };
      case "alert":     return { transform: "translateX(-4px)", transition: "transform 0.2s ease-out" };
      case "greeting":  return { animation: "cfo-gesture 0.7s ease-in-out" };
      case "thinking":  return { animation: "cfo-analyze 2.2s ease-in-out infinite" };
      case "talking":   return { animation: "cfo-gesture 1.4s ease-in-out infinite" };
      case "returning": return { opacity: 0.5, transition: "opacity 0.4s ease-out" };
      default:          return {};
    }
  };

  const opacity = state === "idle" ? 0.85 : 1;
  // CFO uses blue analytical tones
  const bodyColor = "rgba(60, 140, 220, 0.9)";
  const deskColor = "rgba(16, 34, 56, 0.95)";
  const accentColor = "#64B4FF";

  return (
    <div
      role="img"
      aria-label="CFO character at analytics desk"
      style={{ display: "inline-block", ...animStyle() }}
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
          <filter id="cfo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Monitor / data screen behind character */}
        <rect x="15" y="30" width="130" height="80" rx="4" fill="#081220" stroke={accentColor} strokeWidth="1.5" opacity="0.9" />

        {/* Screen content — bar chart */}
        {[0.4, 0.65, 0.5, 0.85, 0.7, 0.55].map((h, i) => (
          <rect
            key={i}
            x={24 + i * 18}
            y={30 + 80 - 10 - h * 50}
            width="12"
            height={h * 50}
            rx="1"
            fill={accentColor}
            opacity={0.3 + h * 0.4}
          />
        ))}

        {/* Desk */}
        <rect x="20" y="220" width="120" height="10" rx="3" fill={deskColor} stroke={accentColor} strokeWidth="1" opacity="0.85" />

        {/* Legs */}
        <rect x="62" y="195" width="11" height="30" rx="3" fill={bodyColor} opacity={opacity} filter="url(#cfo-glow)" />
        <rect x="87" y="195" width="11" height="30" rx="3" fill={bodyColor} opacity={opacity} filter="url(#cfo-glow)" />

        {/* Torso */}
        <rect x="56" y="138" width="48" height="60" rx="6" fill={bodyColor} opacity={opacity} filter="url(#cfo-glow)" />

        {/* Left arm — angled toward desk */}
        <rect x="28" y="148" width="30" height="10" rx="5" fill={bodyColor} opacity={opacity} filter="url(#cfo-glow)" transform="rotate(20 28 153)" />

        {/* Right arm */}
        <rect x="102" y="150" width="28" height="10" rx="5" fill={bodyColor} opacity={opacity} filter="url(#cfo-glow)" transform="rotate(-15 102 155)" />

        {/* Head */}
        <circle cx="80" cy="122" r="17" fill={bodyColor} opacity={opacity} filter="url(#cfo-glow)" />

        {/* Eyes */}
        <circle cx="74" cy="120" r="2.5" fill="#E8F4FD" opacity="0.9" />
        <circle cx="86" cy="120" r="2.5" fill="#E8F4FD" opacity="0.9" />

        {/* Alert badge */}
        {(state === "alert" || state === "greeting") && (
          <circle cx="96" cy="106" r="7" fill="#F59E0B" opacity="0.95" />
        )}

        {/* Glasses hint — CFO look */}
        <rect x="69" y="118" width="10" height="5" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
        <rect x="81" y="118" width="10" height="5" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
        <line x1="79" y1="121" x2="81" y2="121" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface CFOCharacterProps {
  onConversationOpen?: () => void;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CFOCharacter({
  onConversationOpen,
  dialogueOpen,
  dialogueStatus,
}: CFOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const reducedMotion = useReducedMotion();
  const state = snapshot.value as string;

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
    send({ type: "STOP_TALKING" });
  }, [dialogueOpen, dialogueStatus, send]);

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

  const stateLabels: Record<string, string> = {
    idle:      "CFO — Click to open analytics review",
    alert:     "CFO is noticing you — click to talk",
    greeting:  "CFO is greeting you",
    ready:     "CFO is ready to review your numbers",
    thinking:  "CFO is analyzing data",
    talking:   "CFO is speaking",
    returning: "CFO is stepping back",
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={stateLabels[state] ?? "CFO Character"}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg"
        style={{
          focusVisibleOutlineColor: "rgba(60, 140, 220, 0.7)",
          WebkitTapHighlightColor: "transparent",
        } as React.CSSProperties}
      >
        <CFOSilhouette state={state} reducedMotion={reducedMotion} />

        <span
          aria-hidden="true"
          className="mt-2 text-xs font-mono tracking-wide uppercase"
          style={{ color: state === "idle" ? "rgba(74, 122, 155, 0.8)" : "rgba(60, 140, 220, 0.9)" }}
        >
          {state === "idle" ? "CFO" : "● CFO"}
        </span>
      </button>
    </>
  );
}
