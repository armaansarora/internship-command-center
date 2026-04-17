"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/coo/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Animation CSS — COO / Dylan Shorts
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes coo-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes coo-lean-forward {
  0% { transform: translateX(0) scaleX(1); }
  100% { transform: translateX(4px) scaleX(1.02); }
}
@keyframes coo-type {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-3px) rotate(-1deg); }
  75% { transform: translateY(-1px) rotate(0.5deg); }
}
@keyframes coo-gesture {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(-3deg); }
  75% { transform: translateY(-2px) rotate(2deg); }
}
@keyframes coo-desk-drum {
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(-4px); }
  40% { transform: translateY(0); }
  60% { transform: translateY(-2px); }
  80% { transform: translateY(0); }
}
`;

// ---------------------------------------------------------------------------
// Character SVG — Dylan Shorts, seated at desk with monitors
// ---------------------------------------------------------------------------
function CharacterSilhouette({
  state,
  reducedMotion,
  overdueCount,
}: {
  state: string;
  reducedMotion: boolean;
  overdueCount: number;
}): JSX.Element {
  const animationStyle = (): React.CSSProperties => {
    if (reducedMotion) return {};

    switch (state) {
      case "idle":
        return {
          animation: "coo-breathe 4s ease-in-out infinite",
        };
      case "alert":
        return {
          transform: "translateX(4px) scaleX(1.02)",
          transition: "transform 0.2s ease-out",
        };
      case "greeting":
        return {
          animation: "coo-gesture 0.6s ease-in-out",
        };
      case "thinking":
        return {
          animation: "coo-type 1.2s ease-in-out infinite",
        };
      case "talking":
        return {
          animation: "coo-gesture 1.0s ease-in-out infinite",
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
  const hasOverdue = overdueCount > 0;

  return (
    <div
      role="img"
      aria-label="COO character silhouette — Dylan Shorts seated at desk"
      style={{ display: "inline-block", ...animationStyle() }}
    >
      <svg
        width="200"
        height="260"
        viewBox="0 0 200 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ── Defs: glow filter ── */}
        <defs>
          <filter id="coo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="coo-glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Background: three monitors on desk ── */}
        {/* Desk surface */}
        <rect
          x="10"
          y="165"
          width="180"
          height="8"
          rx="2"
          fill="#1C1404"
          stroke="#3D2E0A"
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* Left monitor */}
        <rect
          x="12"
          y="100"
          width="48"
          height="65"
          rx="3"
          fill="#120C02"
          stroke="#3D2E0A"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Left monitor screen glow */}
        <rect
          x="15"
          y="103"
          width="42"
          height="56"
          rx="2"
          fill="rgba(220, 124, 40, 0.07)"
          opacity="0.8"
        />
        {/* Left monitor: calendar grid */}
        <line x1="18" y1="112" x2="54" y2="112" stroke="#DC7C28" strokeWidth="1" opacity="0.5" />
        <line x1="18" y1="120" x2="54" y2="120" stroke="#3D2E0A" strokeWidth="0.5" opacity="0.6" />
        <line x1="18" y1="128" x2="54" y2="128" stroke="#3D2E0A" strokeWidth="0.5" opacity="0.6" />
        <line x1="18" y1="136" x2="54" y2="136" stroke="#3D2E0A" strokeWidth="0.5" opacity="0.6" />
        {/* Calendar date highlight */}
        <rect x="30" y="116" width="8" height="7" rx="1" fill="#DC7C28" opacity="0.4" />
        {/* Left monitor stand */}
        <rect x="33" y="165" width="5" height="6" rx="1" fill="#3D2E0A" opacity="0.9" />

        {/* Center monitor — main / larger */}
        <rect
          x="70"
          y="85"
          width="60"
          height="80"
          rx="3"
          fill="#120C02"
          stroke="#DC7C28"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Center monitor screen */}
        <rect
          x="73"
          y="88"
          width="54"
          height="70"
          rx="2"
          fill="rgba(220, 124, 40, 0.10)"
          opacity="0.9"
        />
        {/* Center monitor: email / data lines */}
        <line x1="76" y1="97" x2="124" y2="97" stroke="#DC7C28" strokeWidth="1.5" opacity="0.7" />
        <line x1="76" y1="106" x2="110" y2="106" stroke="#F0A050" strokeWidth="1" opacity="0.5" />
        <line x1="76" y1="115" x2="118" y2="115" stroke="#7A5B35" strokeWidth="1" opacity="0.5" />
        <line x1="76" y1="124" x2="105" y2="124" stroke="#7A5B35" strokeWidth="1" opacity="0.4" />
        {/* Overdue highlight on center monitor */}
        {hasOverdue && (
          <rect x="76" y="133" width="48" height="10" rx="2" fill="#DC3C3C" opacity="0.25" />
        )}
        <line x1="76" y1="143" x2="120" y2="143" stroke="#7A5B35" strokeWidth="1" opacity="0.4" />
        {/* Center monitor stand */}
        <rect x="97" y="165" width="6" height="6" rx="1" fill="#3D2E0A" opacity="0.9" />

        {/* Right monitor */}
        <rect
          x="140"
          y="100"
          width="48"
          height="65"
          rx="3"
          fill="#120C02"
          stroke="#3D2E0A"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* Right monitor screen */}
        <rect
          x="143"
          y="103"
          width="42"
          height="56"
          rx="2"
          fill="rgba(220, 124, 40, 0.06)"
          opacity="0.8"
        />
        {/* Right monitor: timeline bars */}
        <rect x="146" y="108" width="35" height="5" rx="2" fill="#DC7C28" opacity="0.5" />
        <rect x="146" y="117" width="25" height="5" rx="2" fill="#F59E0B" opacity="0.45" />
        <rect x="146" y="126" width="30" height="5" rx="2" fill="#DC7C28" opacity="0.40" />
        <rect x="146" y="135" width="20" height="5" rx="2" fill="#7A5B35" opacity="0.35" />
        <rect x="146" y="144" width="28" height="5" rx="2" fill="#7A5B35" opacity="0.30" />
        {/* Right monitor stand */}
        <rect x="161" y="165" width="5" height="6" rx="1" fill="#3D2E0A" opacity="0.9" />

        {/* ── Keyboard on desk ── */}
        <rect
          x="72"
          y="175"
          width="56"
          height="14"
          rx="3"
          fill="#1C1404"
          stroke="#3D2E0A"
          strokeWidth="1"
          opacity="0.9"
        />
        {/* Keyboard keys hint */}
        <rect x="75" y="178" width="5" height="3" rx="0.5" fill="#3D2E0A" opacity="0.7" />
        <rect x="82" y="178" width="5" height="3" rx="0.5" fill="#3D2E0A" opacity="0.7" />
        <rect x="89" y="178" width="5" height="3" rx="0.5" fill="#3D2E0A" opacity="0.7" />
        <rect x="96" y="178" width="5" height="3" rx="0.5" fill="#3D2E0A" opacity="0.7" />
        <rect x="103" y="178" width="5" height="3" rx="0.5" fill="#3D2E0A" opacity="0.7" />
        <rect x="110" y="178" width="5" height="3" rx="0.5" fill="#3D2E0A" opacity="0.7" />
        <rect x="117" y="178" width="5" height="3" rx="0.5" fill="#3D2E0A" opacity="0.7" />
        {/* Space bar */}
        <rect x="83" y="184" width="34" height="3" rx="1" fill="#3D2E0A" opacity="0.7" />

        {/* ── Seated figure: Dylan Shorts ── */}

        {/* Chair back */}
        <rect
          x="74"
          y="195"
          width="52"
          height="55"
          rx="6"
          fill="#1C1404"
          stroke="#3D2E0A"
          strokeWidth="1"
          opacity="0.8"
        />

        {/* Legs/lower body */}
        <rect
          x="82"
          y="220"
          width="16"
          height="30"
          rx="4"
          fill="#DC7C28"
          opacity={opacity * 0.9}
          filter="url(#coo-glow)"
        />
        <rect
          x="102"
          y="220"
          width="16"
          height="30"
          rx="4"
          fill="#DC7C28"
          opacity={opacity * 0.9}
          filter="url(#coo-glow)"
        />

        {/* Torso */}
        <rect
          x="76"
          y="185"
          width="48"
          height="38"
          rx="6"
          fill="#DC7C28"
          opacity={opacity}
          filter="url(#coo-glow)"
        />

        {/* Left arm — extended toward keyboard */}
        <rect
          x="50"
          y="195"
          width="30"
          height="10"
          rx="5"
          fill="#DC7C28"
          opacity={opacity}
          filter="url(#coo-glow)"
          transform="rotate(8 50 200)"
        />
        {/* Left hand over keyboard */}
        <circle
          cx="78"
          cy="205"
          r="6"
          fill="#DC7C28"
          opacity={opacity * 0.9}
          filter="url(#coo-glow)"
        />

        {/* Right arm — toward keyboard or gesturing */}
        <rect
          x="120"
          y="192"
          width="28"
          height="10"
          rx="5"
          fill="#DC7C28"
          opacity={opacity}
          filter="url(#coo-glow)"
          transform={state === "talking" ? "rotate(-15 120 197)" : "rotate(-5 120 197)"}
        />
        {/* Right hand */}
        <circle
          cx="122"
          cy="203"
          r="6"
          fill="#DC7C28"
          opacity={opacity * 0.9}
          filter="url(#coo-glow)"
        />

        {/* Head */}
        <circle
          cx="100"
          cy="167"
          r="18"
          fill="#DC7C28"
          opacity={opacity}
          filter="url(#coo-glow)"
        />

        {/* Eyes — focused on monitors */}
        <circle cx="94" cy="165" r="2.5" fill="#FDF3E8" opacity="0.9" />
        <circle cx="106" cy="165" r="2.5" fill="#FDF3E8" opacity="0.9" />
        {/* Slight downward gaze toward screens */}
        <circle cx="94.5" cy="166" r="1.2" fill="#120C02" opacity="0.85" />
        <circle cx="106.5" cy="166" r="1.2" fill="#120C02" opacity="0.85" />

        {/* Overdue alert badge */}
        {hasOverdue && (
          <>
            <circle
              cx="120"
              cy="150"
              r="10"
              fill="#DC3C3C"
              opacity="0.95"
              filter="url(#coo-glow-red)"
            />
            <text
              x="120"
              y="154"
              textAnchor="middle"
              fill="#FDF3E8"
              fontSize="9"
              fontWeight="700"
              fontFamily="IBM Plex Mono, monospace"
            >
              {overdueCount > 9 ? "9+" : overdueCount}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Idle desk-drumming animation component
// ---------------------------------------------------------------------------
function DeskDrumAnimation({ active }: { active: boolean }): JSX.Element {
  if (!active) return <></>;
  return (
    <style>{`
@keyframes coo-desk-drum-l {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
  60% { transform: translateY(0); }
}
@keyframes coo-desk-drum-r {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  80% { transform: translateY(0); }
}
    `}</style>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface COOCharacterProps {
  onConversationOpen?: () => void;
  overdueCount?: number;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function COOCharacter({
  onConversationOpen,
  overdueCount = 0,
  dialogueOpen,
  dialogueStatus,
}: COOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const reducedMotion = useReducedMotion();

  const currentState = snapshot.value as string;

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

  const stateLabel: Record<string, string> = {
    idle: "COO Dylan Shorts — Click to open operations briefing",
    alert: "COO is noticing you — click to talk",
    greeting: "COO is greeting you",
    ready: "COO is ready — ask about your deadlines",
    thinking: "COO is reviewing your calendar",
    talking: "COO is briefing you",
    returning: "COO is stepping back",
  };

  return (
    <>
      {/* Inject keyframe CSS once */}
      <style>{KEYFRAMES}</style>
      <DeskDrumAnimation active={currentState === "idle" && !reducedMotion} />

      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={stateLabel[currentState] ?? "COO Character"}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg"
        style={{
          WebkitTapHighlightColor: "transparent",
          outlineColor: "#DC7C28",
        }}
      >
        <CharacterSilhouette
          state={currentState}
          reducedMotion={reducedMotion}
          overdueCount={overdueCount}
        />

        {/* Status indicator */}
        <span
          aria-hidden="true"
          className="mt-1 text-xs font-mono tracking-wide uppercase"
          style={{
            color: currentState === "idle" ? "#7A5B35" : "#DC7C28",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          {currentState === "idle" ? "COO" : "● COO"}
        </span>
      </button>
    </>
  );
}
