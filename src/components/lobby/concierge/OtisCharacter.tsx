"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { OtisAvatar } from "./OtisAvatar";

/**
 * OtisCharacter — the Concierge, standing at the reception desk in the Lobby.
 *
 * Otis is a NEW named character introduced in R4. Explicitly not a reused
 * department head (no imports from src/components/floor-N/*); his visual
 * palette and posture are deliberately distinct so the lobby feels like a
 * different register from the C-suite floors.
 *
 * Motion is delegated to CharacterStage so Otis uses the same pose plus
 * micro-motion contract as the rest of the Season 1 cast.
 */

export type OtisMood = "idle" | "greeting" | "listening" | "thinking" | "talking";

interface OtisCharacterProps {
  onGreet?: () => void;
  mood?: OtisMood;
  className?: string;
  style?: CSSProperties;
  avatarStyle?: CSSProperties;
  showNameplate?: boolean;
}

export function OtisCharacter({
  onGreet,
  mood: controlledMood,
  className,
  style,
  avatarStyle,
  showNameplate = true,
}: OtisCharacterProps = {}): JSX.Element {
  const [internalMood, setInternalMood] = useState<OtisMood>("idle");
  const mood = controlledMood ?? internalMood;

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
    <button
      type="button"
      onClick={handleGreet}
      data-character="otis"
      data-character-mood={mood}
      aria-label={moodLabels[mood]}
      className={`relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg ${className ?? ""}`}
      style={{ WebkitTapHighlightColor: "transparent", ...style }}
    >
      <OtisAvatar mood={mood} style={avatarStyle} />
      {showNameplate && (
        <span
          aria-hidden="true"
          className="mt-2 text-xs font-mono tracking-wide uppercase"
          style={{ color: mood === "idle" ? "rgba(107, 42, 46, 0.78)" : "#8A3B3F" }}
        >
          {mood === "idle" ? "Otis · Concierge" : "● Otis"}
        </span>
      )}
    </button>
  );
}
