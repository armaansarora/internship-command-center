"use client";

import type { CSSProperties, JSX } from "react";
import { CharacterStage, type CharacterStageState } from "@/components/visual-assets/CharacterStage";

type OtisMood = "idle" | "greeting" | "listening" | "thinking" | "talking";

const STAGE_STATE_BY_MOOD: Record<OtisMood, CharacterStageState> = {
  idle: "idle",
  greeting: "greeting",
  listening: "listening",
  thinking: "thinking",
  talking: "talking",
};

export function OtisAvatar({
  mood,
  className,
  style,
}: {
  mood: OtisMood;
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <CharacterStage
      characterId="otis"
      state={STAGE_STATE_BY_MOOD[mood]}
      aria-label="Otis, the Concierge, standing at the reception desk"
      className={className}
      style={style}
    />
  );
}
