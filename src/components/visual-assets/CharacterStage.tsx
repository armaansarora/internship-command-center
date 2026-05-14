"use client";

import type { CSSProperties, JSX } from "react";
import { CharacterSprite } from "./CharacterSprite";
import {
  getCharacterVisualMetadata,
  type CharacterId,
  type CharacterOutfitVariant,
  type CharacterPose,
} from "@/lib/visual-assets";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type CharacterStageState =
  | "idle"
  | "ready"
  | "returning"
  | "alert"
  | "greeting"
  | "listening"
  | "thinking"
  | "briefing"
  | "writing"
  | "talking";

const POSE_BY_STATE: Record<CharacterStageState, CharacterPose> = {
  idle: "idle",
  ready: "idle",
  returning: "idle",
  alert: "alert",
  greeting: "greeting",
  listening: "listening",
  thinking: "thinking",
  briefing: "talking",
  writing: "working",
  talking: "talking",
};

const MOTION_BY_STATE: Record<CharacterStageState, string> = {
  idle: "idle",
  ready: "idle",
  returning: "idle",
  alert: "alert",
  greeting: "greet",
  listening: "listen",
  thinking: "think",
  briefing: "talk",
  writing: "work",
  talking: "talk",
};

const CHARACTER_STAGE_KEYFRAMES = `
@keyframes tower-character-stage-breathe {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -1.5px, 0); }
}
@keyframes tower-character-stage-nod {
  0% { transform: translate3d(0, 0, 0) rotate(0); }
  42% { transform: translate3d(0, 1px, 0) rotate(-0.7deg); }
  100% { transform: translate3d(0, 0, 0) rotate(0); }
}
@keyframes tower-character-stage-lean {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0.75px, -2px, 0); }
}
@keyframes tower-character-stage-pulse {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -1px, 0) scale(1.006); }
}
@keyframes tower-character-stage-alert {
  0%, 100% { transform: translate3d(0, 0, 0); }
  36% { transform: translate3d(1px, -1px, 0); }
}
.tower-character-stage-idle { animation: tower-character-stage-breathe 6s ease-in-out infinite; }
.tower-character-stage-greet { animation: tower-character-stage-nod 0.9s ease-in-out; }
.tower-character-stage-listen { animation: tower-character-stage-lean 4s ease-in-out infinite; }
.tower-character-stage-think { animation: tower-character-stage-breathe 3.2s ease-in-out infinite; }
.tower-character-stage-talk { animation: tower-character-stage-pulse 2s ease-in-out infinite; }
.tower-character-stage-alert { animation: tower-character-stage-alert 0.9s ease-in-out infinite; }
.tower-character-stage-work { animation: tower-character-stage-breathe 2.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tower-character-stage-idle,
  .tower-character-stage-greet,
  .tower-character-stage-listen,
  .tower-character-stage-think,
  .tower-character-stage-talk,
  .tower-character-stage-alert,
  .tower-character-stage-work {
    animation: none !important;
    transform: none !important;
  }
}
`;

interface CharacterStageProps {
  characterId: CharacterId;
  state: CharacterStageState;
  outfitVariant?: CharacterOutfitVariant;
  "aria-label": string;
  className?: string;
  style?: CSSProperties;
  reducedMotionOverride?: boolean;
}

export function CharacterStage({
  characterId,
  state,
  outfitVariant = "regular",
  "aria-label": ariaLabel,
  className,
  style,
  reducedMotionOverride,
}: CharacterStageProps): JSX.Element {
  const character = getCharacterVisualMetadata(characterId);
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? prefersReducedMotion;
  const pose = POSE_BY_STATE[state];
  const motion = MOTION_BY_STATE[state];
  const motionClass = reducedMotion ? "" : `tower-character-stage-${motion}`;

  return (
    <div
      data-character={characterId}
      data-character-state={state}
      data-character-pose={pose}
      data-character-outfit={outfitVariant}
      data-character-motion-profile={character.motionProfile}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      className={[motionClass, className].filter(Boolean).join(" ")}
      style={{
        display: "inline-grid",
        placeItems: "center",
        transformOrigin: "50% 92%",
        willChange: reducedMotion ? undefined : "transform",
      }}
    >
      <style>{CHARACTER_STAGE_KEYFRAMES}</style>
      <CharacterSprite
        characterId={characterId}
        outfitVariant={outfitVariant}
        pose={pose}
        state={state}
        aria-label={ariaLabel}
        style={style}
      />
    </div>
  );
}
