"use client";

import type { JSX } from "react";
import { useCallback, useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cpo/character-machine";
import { AgentCharacterButton } from "@/components/visual-assets/AgentCharacterButton";

type CPOState =
  | "idle"
  | "alert"
  | "greeting"
  | "ready"
  | "talking"
  | "thinking"
  | "briefing"
  | "returning";

interface CPOCharacterProps {
  onConversationOpen?: () => void;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CPOCharacter({
  onConversationOpen,
  dialogueOpen,
  dialogueStatus,
}: CPOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const state = snapshot.value as CPOState;

  useEffect(() => {
    if (dialogueOpen === false && snapshot.context.isConversationOpen) {
      send({ type: "DISMISS" });
    }
  }, [dialogueOpen, send, snapshot.context.isConversationOpen]);

  useEffect(() => {
    if (!dialogueOpen || !dialogueStatus) return;
    if (dialogueStatus === "thinking") {
      send({ type: "START_THINKING" });
      return;
    }
    if (dialogueStatus === "talking") {
      send({ type: "START_TALKING" });
      return;
    }
    send({ type: "STOP_BRIEFING" });
    send({ type: "STOP_TALKING" });
  }, [dialogueOpen, dialogueStatus, send]);

  const handleClick = useCallback(() => {
    send({ type: "CLICK" });
    if (!snapshot.context.isConversationOpen) onConversationOpen?.();
  }, [onConversationOpen, send, snapshot.context.isConversationOpen]);

  const stateLabel: Record<CPOState, string> = {
    idle: "CPO — Click to open interview briefing",
    alert: "CPO noticed you — click to talk",
    greeting: "CPO is greeting you",
    ready: "CPO is ready for your next prep request",
    talking: "CPO is speaking",
    thinking: "CPO is analyzing your prep",
    briefing: "CPO is presenting interview prep",
    returning: "CPO is stepping back",
  };

  return (
    <AgentCharacterButton
      characterId="cpo"
      state={state}
      label={stateLabel[state]}
      idleLabel="CPO"
      activeLabel="● CPO"
      isOpen={snapshot.context.isConversationOpen}
      accent={state === "briefing" ? "#00E5FF" : "#4A9EDB"}
      onClick={handleClick}
      onMouseEnter={() => send({ type: "HOVER" })}
      onMouseLeave={() => send({ type: "LEAVE" })}
    />
  );
}
