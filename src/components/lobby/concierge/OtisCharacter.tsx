"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { OtisAvatar } from "./OtisAvatar";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * OtisCharacter — the Concierge, standing at the reception desk in the Lobby.
 *
 * Otis is a NEW named character introduced in R4. Explicitly not a reused
 * department head (no imports from src/components/floor-N/*); his visual
 * palette and posture are deliberately distinct so the lobby feels like a
 * different register from the C-suite floors.
 *
 * Animation is kept lightweight: a slow breathing idle, a brief nod on
 * greeting, and a subtle forward lean while listening. All animations are
 * suppressed under `prefers-reduced-motion` per the global motion-discipline.
 */

const KEYFRAMES = `
@keyframes otis-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
}
@keyframes otis-nod {
  0% { transform: translateY(0) rotate(0); }
  40% { transform: translateY(1px) rotate(-0.6deg); }
  100% { transform: translateY(0) rotate(0); }
}
@keyframes otis-lean {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px) translateX(0.5px); }
}
`;

export type OtisMood = "idle" | "greeting" | "listening" | "thinking" | "talking";

interface OtisCharacterProps {
  onGreet?: () => void;
  mood?: OtisMood;
}

export function OtisCharacter({ onGreet, mood: controlledMood }: OtisCharacterProps = {}): JSX.Element {
  const [internalMood, setInternalMood] = useState<OtisMood>("idle");
  const mood = controlledMood ?? internalMood;
  const reducedMotion = useReducedMotion();

  const animation = (() => {
    if (reducedMotion) return undefined;
    switch (mood) {
      case "idle": return "otis-breathe 6s ease-in-out infinite";
      case "greeting": return "otis-nod 0.9s ease-in-out";
      case "listening": return "otis-lean 4s ease-in-out infinite";
      case "thinking": return "otis-breathe 3s ease-in-out infinite";
      case "talking": return "otis-breathe 2.2s ease-in-out infinite";
      default: return undefined;
    }
  })();

  useEffect(() => {
    if (controlledMood !== undefined) return;
    if (mood === "greeting") {
      const t = window.setTimeout(() => setInternalMood("listening"), 900);
      return () => window.clearTimeout(t);
    }
  }, [mood, controlledMood]);

  const handleGreet = useCallback(() => {
    if (controlledMood === undefined) setInternalMood("greeting");
    onGreet?.();
  }, [controlledMood, onGreet]);

  const moodLabels: Record<OtisMood, string> = {
    idle: "Otis, the Concierge, is at the desk. Click to speak with him.",
    greeting: "Otis is greeting you.",
    listening: "Otis is listening.",
    thinking: "Otis is composing his reply.",
    talking: "Otis is speaking.",
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <button
        type="button"
        onClick={handleGreet}
        data-character="otis"
        data-character-mood={mood}
        aria-label={moodLabels[mood]}
        className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg"
        style={{ WebkitTapHighlightColor: "transparent", animation } as React.CSSProperties}
      >
        <OtisAvatar mood={mood} />
        <span
          aria-hidden="true"
          className="mt-2 text-xs font-mono tracking-wide uppercase"
          style={{ color: mood === "idle" ? "rgba(107, 42, 46, 0.78)" : "#8A3B3F" }}
        >
          {mood === "idle" ? "Otis · Concierge" : "● Otis"}
        </span>
      </button>
    </>
  );
}
