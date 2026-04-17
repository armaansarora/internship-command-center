"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { cioCharacterMachine } from "@/lib/agents/cio/character-machine";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Animation CSS — CIO / cerebral research analyst aesthetic
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes cio-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes cio-lean-forward {
  0% { transform: translateX(0) scaleX(1); }
  100% { transform: translateX(3px) scaleX(1.01); }
}
@keyframes cio-scan {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  30% { transform: translateY(-2px) rotate(-1.5deg); }
  70% { transform: translateY(-1px) rotate(1deg); }
}
@keyframes cio-gesture {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-6px) rotate(-4deg); }
  75% { transform: translateY(-2px) rotate(2.5deg); }
}
@keyframes cio-doc-float-1 {
  0%, 100% { transform: translateY(0) rotate(-2deg); opacity: 0.55; }
  50% { transform: translateY(-5px) rotate(-1deg); opacity: 0.7; }
}
@keyframes cio-doc-float-2 {
  0%, 100% { transform: translateY(0) rotate(3deg); opacity: 0.45; }
  60% { transform: translateY(-4px) rotate(4deg); opacity: 0.6; }
}
@keyframes cio-data-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.65; }
}
`;

// ---------------------------------------------------------------------------
// Floating document/data element — decorative ambient elements
// ---------------------------------------------------------------------------
function FloatingDataElement({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{ top: 0, left: 0, width: "200px", height: "260px" }}
    >
      {/* Floating document card — top left */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "-18px",
          width: "32px",
          height: "38px",
          backgroundColor: "#0D1B2A",
          border: "1px solid #1E3A5F",
          borderRadius: "3px",
          animation: reducedMotion ? "none" : "cio-doc-float-1 4.5s ease-in-out infinite",
          opacity: 0.55,
        }}
      >
        <div style={{ margin: "5px 4px 0", height: "2px", backgroundColor: "#3B82F6", borderRadius: "1px", opacity: 0.8 }} />
        <div style={{ margin: "3px 4px 0", height: "1.5px", backgroundColor: "#1E3A5F", borderRadius: "1px" }} />
        <div style={{ margin: "2px 4px 0", height: "1.5px", backgroundColor: "#1E3A5F", borderRadius: "1px" }} />
        <div style={{ margin: "2px 4px 0", height: "1.5px", backgroundColor: "#1E3A5F", borderRadius: "1px", width: "60%" }} />
      </div>

      {/* Floating document card — top right */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "-14px",
          width: "28px",
          height: "34px",
          backgroundColor: "#0D1B2A",
          border: "1px solid #1E3A5F",
          borderRadius: "3px",
          animation: reducedMotion ? "none" : "cio-doc-float-2 5.2s ease-in-out infinite",
          opacity: 0.45,
        }}
      >
        <div style={{ margin: "5px 3px 0", height: "2px", backgroundColor: "#60A5FA", borderRadius: "1px", opacity: 0.7 }} />
        <div style={{ margin: "3px 3px 0", height: "1.5px", backgroundColor: "#1E3A5F", borderRadius: "1px" }} />
        <div style={{ margin: "2px 3px 0", height: "1.5px", backgroundColor: "#1E3A5F", borderRadius: "1px", width: "70%" }} />
      </div>

      {/* Data stream dots — right side */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            right: "-6px",
            top: `${80 + i * 18}px`,
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: "#3B82F6",
            animation: reducedMotion
              ? "none"
              : `cio-data-pulse ${2 + i * 0.4}s ease-in-out infinite ${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Character SVG — CIO, standing analyst with holographic display
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
          animation: "cio-breathe 4.5s ease-in-out infinite",
        };
      case "alert":
        return {
          transform: "translateX(3px) scaleX(1.01)",
          transition: "transform 0.2s ease-out",
        };
      case "greeting":
        return {
          animation: "cio-gesture 0.7s ease-in-out",
        };
      case "thinking":
        return {
          animation: "cio-scan 1.4s ease-in-out infinite",
        };
      case "talking":
        return {
          animation: "cio-gesture 1.1s ease-in-out infinite",
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

  const opacity = state === "idle" ? 0.88 : 1;
  const isTalking = state === "talking";
  const isThinking = state === "thinking";

  // Deep blue/silver palette — analytical intelligence
  const primaryBlue = "#3B82F6";
  const deepBlue = "#1E3A5F";
  const silverGray = "#94A3B8";
  const lightBlue = "#60A5FA";
  const darkBg = "#0D1B2A";

  return (
    <div
      role="img"
      aria-label="CIO character silhouette — standing analyst with holographic research display"
      style={{ display: "inline-block", position: "relative", ...animationStyle() }}
    >
      <svg
        width="200"
        height="260"
        viewBox="0 0 200 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ── Defs: glow filters ── */}
        <defs>
          <filter id="cio-glow-blue" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cio-glow-silver" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="cio-screen-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryBlue} stopOpacity="0.15" />
            <stop offset="100%" stopColor={deepBlue} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* ── Holographic display / research terminal ── */}
        {/* Main display panel */}
        <rect
          x="30"
          y="60"
          width="140"
          height="90"
          rx="4"
          fill={darkBg}
          stroke={deepBlue}
          strokeWidth="1.5"
          opacity="0.92"
        />
        {/* Screen glow */}
        <rect
          x="33"
          y="63"
          width="134"
          height="84"
          rx="3"
          fill="url(#cio-screen-grad)"
          opacity="0.9"
        />

        {/* Screen header bar */}
        <rect x="33" y="63" width="134" height="10" rx="3" fill={deepBlue} opacity="0.7" />
        <circle cx="40" cy="68" r="2" fill={primaryBlue} opacity="0.6" />
        <circle cx="47" cy="68" r="2" fill={silverGray} opacity="0.4" />
        <circle cx="54" cy="68" r="2" fill={silverGray} opacity="0.3" />

        {/* Screen content: company research lines */}
        <line x1="38" y1="82" x2="100" y2="82" stroke={primaryBlue} strokeWidth="1.5" opacity="0.65" />
        <line x1="38" y1="90" x2="120" y2="90" stroke={silverGray} strokeWidth="1" opacity="0.45" />
        <line x1="38" y1="98" x2="90" y2="98" stroke={silverGray} strokeWidth="1" opacity="0.4" />
        <line x1="38" y1="106" x2="110" y2="106" stroke={silverGray} strokeWidth="1" opacity="0.35" />
        <line x1="38" y1="114" x2="80" y2="114" stroke={silverGray} strokeWidth="1" opacity="0.3" />

        {/* Thinking state: additional analysis bars */}
        {isThinking && (
          <>
            <rect x="110" y="80" width="50" height="6" rx="2" fill={primaryBlue} opacity="0.3" />
            <rect x="110" y="90" width="35" height="6" rx="2" fill={lightBlue} opacity="0.25" />
            <rect x="110" y="100" width="42" height="6" rx="2" fill={primaryBlue} opacity="0.2" />
          </>
        )}

        {/* Talking state: animated highlight */}
        {isTalking && (
          <rect x="33" y="128" width="134" height="14" rx="2" fill={primaryBlue} opacity="0.12" />
        )}

        {/* Active cursor / indicator dot */}
        <circle
          cx="155"
          cy="68"
          r="2.5"
          fill={primaryBlue}
          opacity="0.8"
          filter="url(#cio-glow-blue)"
        />

        {/* Display stand */}
        <rect x="92" y="150" width="16" height="8" rx="2" fill={deepBlue} opacity="0.8" />
        <rect x="82" y="158" width="36" height="4" rx="2" fill={deepBlue} opacity="0.6" />

        {/* ── Standing figure ── */}

        {/* Legs */}
        <rect
          x="85"
          y="215"
          width="13"
          height="38"
          rx="4"
          fill={primaryBlue}
          opacity={opacity * 0.85}
          filter="url(#cio-glow-blue)"
        />
        <rect
          x="102"
          y="215"
          width="13"
          height="38"
          rx="4"
          fill={primaryBlue}
          opacity={opacity * 0.85}
          filter="url(#cio-glow-blue)"
        />

        {/* Torso — structured jacket/analyst look */}
        <rect
          x="78"
          y="178"
          width="44"
          height="40"
          rx="6"
          fill={primaryBlue}
          opacity={opacity}
          filter="url(#cio-glow-blue)"
        />
        {/* Jacket lapel detail */}
        <path
          d="M100 180 L92 192 L100 188 L108 192 Z"
          fill={silverGray}
          opacity={opacity * 0.3}
        />

        {/* Left arm — pointing at screen / gesturing */}
        <rect
          x="46"
          y="182"
          width="34"
          height="10"
          rx="5"
          fill={primaryBlue}
          opacity={opacity * 0.9}
          filter="url(#cio-glow-blue)"
          transform={isTalking ? "rotate(12 46 187)" : "rotate(5 46 187)"}
        />
        {/* Left hand */}
        <circle
          cx="78"
          cy="183"
          r="6"
          fill={primaryBlue}
          opacity={opacity * 0.85}
          filter="url(#cio-glow-blue)"
        />

        {/* Right arm */}
        <rect
          x="122"
          y="183"
          width="32"
          height="10"
          rx="5"
          fill={primaryBlue}
          opacity={opacity * 0.9}
          filter="url(#cio-glow-blue)"
          transform={isTalking ? "rotate(-14 122 188)" : "rotate(-6 122 188)"}
        />
        {/* Right hand */}
        <circle
          cx="122"
          cy="194"
          r="6"
          fill={primaryBlue}
          opacity={opacity * 0.85}
          filter="url(#cio-glow-blue)"
        />

        {/* Neck */}
        <rect x="94" y="163" width="12" height="16" rx="3" fill={primaryBlue} opacity={opacity * 0.9} />

        {/* Head */}
        <ellipse
          cx="100"
          cy="155"
          rx="18"
          ry="19"
          fill={primaryBlue}
          opacity={opacity}
          filter="url(#cio-glow-blue)"
        />

        {/* Eyes — sharp, analytical gaze toward screen */}
        <ellipse cx="93" cy="153" rx="3" ry="2.5" fill="#DBEAFE" opacity="0.9" />
        <ellipse cx="107" cy="153" rx="3" ry="2.5" fill="#DBEAFE" opacity="0.9" />
        {/* Pupils — slightly upward toward display */}
        <circle cx="93.5" cy="152" r="1.4" fill={darkBg} opacity="0.9" />
        <circle cx="107.5" cy="152" r="1.4" fill={darkBg} opacity="0.9" />
        {/* Smart glint */}
        <circle cx="94.5" cy="151.2" r="0.6" fill="#DBEAFE" opacity="0.7" />
        <circle cx="108.5" cy="151.2" r="0.6" fill="#DBEAFE" opacity="0.7" />

        {/* Glasses — analytical detail */}
        <rect x="88" y="150" width="8" height="6" rx="2" fill="none" stroke={silverGray} strokeWidth="1" opacity="0.5" />
        <rect x="104" y="150" width="8" height="6" rx="2" fill="none" stroke={silverGray} strokeWidth="1" opacity="0.5" />
        <line x1="96" y1="153" x2="104" y2="153" stroke={silverGray} strokeWidth="0.8" opacity="0.4" />

        {/* Floor shadow */}
        <ellipse cx="100" cy="255" rx="32" ry="4" fill={deepBlue} opacity="0.3" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface CIOCharacterProps {
  onConversationOpen?: () => void;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CIOCharacter({
  onConversationOpen,
  dialogueOpen,
  dialogueStatus,
}: CIOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(cioCharacterMachine);
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
    idle: "CIO — Click to open research intelligence briefing",
    alert: "CIO is noticing you — click to talk",
    greeting: "CIO is greeting you",
    ready: "CIO is ready — ask about company research",
    thinking: "CIO is analyzing research data",
    talking: "CIO is briefing you on intelligence",
    returning: "CIO is stepping back",
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
        aria-label={stateLabel[currentState] ?? "CIO Character"}
        aria-pressed={snapshot.context.isConversationOpen}
        aria-live="polite"
        aria-atomic="true"
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg"
        style={{
          WebkitTapHighlightColor: "transparent",
          outlineColor: "#3B82F6",
        }}
      >
        <div style={{ position: "relative" }}>
          <FloatingDataElement reducedMotion={reducedMotion} />
          <CharacterSilhouette
            state={currentState}
            reducedMotion={reducedMotion}
          />
        </div>

        {/* Status indicator */}
        <span
          aria-hidden="true"
          className="mt-1 text-xs font-mono tracking-wide uppercase"
          style={{
            color: currentState === "idle" ? "#1E3A5F" : "#3B82F6",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          {currentState === "idle" ? "CIO" : "● CIO"}
        </span>
      </button>
    </>
  );
}
