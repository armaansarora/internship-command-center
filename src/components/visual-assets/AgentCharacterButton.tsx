"use client";

import type { CSSProperties, JSX } from "react";
import { CharacterStage, type CharacterStageState } from "./CharacterStage";
import {
  getCharacterVisualMetadata,
  type CharacterId,
} from "@/lib/visual-assets";

const CHARACTER_STAGE_STATES = {
  idle: true,
  ready: true,
  returning: true,
  alert: true,
  greeting: true,
  listening: true,
  thinking: true,
  briefing: true,
  writing: true,
  talking: true,
} as const satisfies Record<CharacterStageState, true>;

function resolveCharacterStageState(state: string): CharacterStageState {
  return state in CHARACTER_STAGE_STATES ? (state as CharacterStageState) : "idle";
}

interface AgentCharacterButtonProps {
  characterId: CharacterId;
  state: string;
  label: string;
  idleLabel: string;
  activeLabel: string;
  isOpen: boolean;
  accent?: string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  badge?: JSX.Element | null;
  priority?: boolean;
  style?: CSSProperties;
}

export function AgentCharacterButton({
  characterId,
  state,
  label,
  idleLabel,
  activeLabel,
  isOpen,
  accent,
  onClick,
  onMouseEnter,
  onMouseLeave,
  badge,
  priority = false,
  style,
}: AgentCharacterButtonProps): JSX.Element {
  const character = getCharacterVisualMetadata(characterId);
  const resolvedAccent = accent ?? character.accent;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={label}
      aria-pressed={isOpen}
      aria-live="polite"
      aria-atomic="true"
      className="relative flex flex-col items-center cursor-pointer select-none bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 rounded-lg"
      style={{
        WebkitTapHighlightColor: "transparent",
        outlineColor: resolvedAccent,
        ...style,
      }}
    >
      <CharacterStage
        characterId={characterId}
        state={resolveCharacterStageState(state)}
        aria-label={label}
        priority={priority}
      />
      {badge}
      <span
        aria-hidden="true"
        className="mt-2 text-xs font-mono tracking-wide uppercase"
        style={{ color: state === "idle" ? "rgba(245,238,225,0.58)" : resolvedAccent }}
      >
        {state === "idle" ? idleLabel : activeLabel}
      </span>
    </button>
  );
}
