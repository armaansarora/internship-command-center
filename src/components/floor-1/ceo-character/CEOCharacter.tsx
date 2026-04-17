"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/ceo/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const KEYFRAMES = `
@keyframes ceo-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes ceo-window-stand {
  0%, 100% { transform: translateX(0) scaleX(1); }
  50% { transform: translateX(-2px) scaleX(1.005); }
}
@keyframes ceo-gesture {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(-3deg); }
  75% { transform: translateY(-2px) rotate(1.5deg); }
}
@keyframes ceo-command {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.02); }
}
`;

function CEOSilhouette({ state, reducedMotion }: { state: string; reducedMotion: boolean }): JSX.Element {
  const animStyle = (): React.CSSProperties => {
    if (reducedMotion) return {};
    switch (state) {
      case "idle":      return { animation: "ceo-window-stand 5s ease-in-out infinite" };
      case "alert":     return { transform: "translateX(-4px) scaleX(1.01)", transition: "transform 0.2s ease-out" };
      case "greeting":  return { animation: "ceo-gesture 0.6s ease-in-out" };
      case "thinking":  return { animation: "ceo-breathe 3s ease-in-out infinite" };
      case "talking":   return { animation: "ceo-gesture 1.2s ease-in-out infinite" };
      case "returning": return { opacity: 0.5, transition: "opacity 0.4s ease-out" };
      default:          return {};
    }
  };

  const opacity = state === "idle" ? 0.9 : 1;
  const goldColor = "rgba(201, 168, 76, 0.9)";
  const goldDim = "rgba(138, 107, 40, 0.9)";

  return (
    <div role="img" aria-label="CEO character at window" style={{ display: "inline-block", ...animStyle() }}>
      <svg
        width="160"
        height="280"
        viewBox="0 0 160 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="ceo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="ceo-window-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201, 168, 76, 0.08)" />
            <stop offset="100%" stopColor="rgba(201, 168, 76, 0.02)" />
          </linearGradient>
        </defs>

        {/* Panoramic window in background */}
        <rect x="5" y="20" width="150" height="110" rx="2" fill="url(#ceo-window-grad)" stroke="rgba(201, 168, 76, 0.2)" strokeWidth="1.5" />
        {/* Window panes */}
        <line x1="80" y1="20" x2="80" y2="130" stroke="rgba(201, 168, 76, 0.12)" strokeWidth="1" />
        <line x1="5" y1="75" x2="155" y2="75" stroke="rgba(201, 168, 76, 0.12)" strokeWidth="1" />

        {/* City skyline silhouette in window */}
        {[
          [15, 90, 12, 40], [30, 100, 8, 30], [42, 80, 14, 50],
          [60, 95, 10, 35], [73, 70, 14, 60], [90, 88, 10, 42],
          [104, 82, 12, 48], [118, 95, 8, 35], [130, 78, 14, 52],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="rgba(12, 9, 2, 0.5)" rx="1" />
        ))}

        {/* Desk */}
        <rect x="25" y="220" width="110" height="8" rx="2" fill="rgba(26, 22, 10, 0.95)" stroke="rgba(201, 168, 76, 0.3)" strokeWidth="1" />

        {/* Legs */}
        <rect x="62" y="192" width="11" height="32" rx="3" fill={goldColor} opacity={opacity} filter="url(#ceo-glow)" />
        <rect x="87" y="192" width="11" height="32" rx="3" fill={goldColor} opacity={opacity} filter="url(#ceo-glow)" />

        {/* Torso — executive build */}
        <rect x="55" y="130" width="50" height="65" rx="7" fill={goldColor} opacity={opacity} filter="url(#ceo-glow)" />

        {/* Suit lapels */}
        <path d="M 70 130 L 80 155 L 80 130 Z" fill={goldDim} opacity={0.5} />
        <path d="M 90 130 L 80 155 L 80 130 Z" fill={goldDim} opacity={0.5} />

        {/* Left arm — slightly extended */}
        <rect x="25" y="140" width="32" height="12" rx="5" fill={goldColor} opacity={opacity} filter="url(#ceo-glow)" transform="rotate(12 25 146)" />

        {/* Right arm */}
        <rect x="103" y="142" width="30" height="12" rx="5" fill={goldColor} opacity={opacity} filter="url(#ceo-glow)" transform="rotate(-12 103 148)" />

        {/* Head — commanding */}
        <circle cx="80" cy="114" r="18" fill={goldColor} opacity={opacity} filter="url(#ceo-glow)" />

        {/* Eyes */}
        <circle cx="74" cy="112" r="2.5" fill="#F5E8C0" opacity="0.9" />
        <circle cx="86" cy="112" r="2.5" fill="#F5E8C0" opacity="0.9" />

        {/* Alert indicator */}
        {(state === "alert" || state === "greeting") && (
          <circle cx="97" cy="98" r="8" fill="rgba(201, 168, 76, 0.9)" opacity="0.95" />
        )}

        {/* CEO pin / badge */}
        <circle cx="82" cy="148" r="3" fill="rgba(201, 168, 76, 0.6)" stroke="rgba(201, 168, 76, 0.9)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

interface CEOCharacterProps {
  onConversationOpen?: () => void;
  externalState?: "idle" | "thinking" | "talking";
  dialogueOpen?: boolean;
}

export function CEOCharacter({
  onConversationOpen,
  externalState,
  dialogueOpen,
}: CEOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const reducedMotion = useReducedMotion();
  const state = snapshot.value as string;

  useEffect(() => {
    if (dialogueOpen === false && snapshot.context.isConversationOpen) {
      send({ type: "DISMISS" });
    }
  }, [dialogueOpen, send, snapshot.context.isConversationOpen]);

  useEffect(() => {
    if (!dialogueOpen || !externalState) {
      return;
    }
    if (externalState === "thinking") {
      send({ type: "START_THINKING" });
      return;
    }
    if (externalState === "talking") {
      send({ type: "START_TALKING" });
      return;
    }
    send({ type: "STOP_TALKING" });
  }, [dialogueOpen, externalState, send]);

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
    idle:      "CEO — Click to open executive briefing",
    alert:     "CEO is noticing you",
    greeting:  "CEO is greeting you",
    ready:     "CEO is ready for your next direction",
    thinking:  "CEO is formulating strategy",
    talking:   "CEO is delivering briefing",
    returning: "CEO is stepping back",
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={stateLabels[state] ?? "CEO Character"}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg"
        style={{ WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
      >
        <CEOSilhouette state={state} reducedMotion={reducedMotion} />
        <span
          aria-hidden="true"
          className="mt-2 text-xs font-mono tracking-wide uppercase"
          style={{ color: state === "idle" ? "rgba(107, 83, 32, 0.9)" : "rgba(201, 168, 76, 0.9)" }}
        >
          {state === "idle" ? "CEO" : "● CEO"}
        </span>
      </button>
    </>
  );
}
