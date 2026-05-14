"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cmo/character-machine";
import { AgentCharacterButton } from "@/components/visual-assets/AgentCharacterButton";

type CMOState =
  | "idle"
  | "alert"
  | "greeting"
  | "ready"
  | "thinking"
  | "talking"
  | "writing"
  | "returning";

interface CMOCharacterProps {
  onConversationOpen?: () => void;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CMOCharacter({
  onConversationOpen,
  dialogueOpen,
  dialogueStatus,
}: CMOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const currentState = snapshot.value as CMOState;

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
    send({ type: "STOP_WRITING" });
    send({ type: "STOP_TALKING" });
  }, [dialogueOpen, dialogueStatus, send]);

  const stateLabel: Record<CMOState, string> = {
    idle: "CMO — Click to open cover letter studio",
    alert: "CMO noticed you — click to start writing",
    greeting: "CMO is greeting you",
    ready: "CMO is ready — let's craft your letter",
    thinking: "CMO is thinking about your application",
    talking: "CMO is speaking",
    writing: "CMO is actively drafting",
    returning: "CMO is returning to work",
  };

  return (
    <AgentCharacterButton
      characterId="cmo"
      state={currentState}
      label={stateLabel[currentState]}
      idleLabel="CMO"
      activeLabel="● CMO"
      isOpen={snapshot.context.isConversationOpen}
      accent="#E8A020"
      onClick={() => {
        send({ type: "CLICK" });
        if (!snapshot.context.isConversationOpen) onConversationOpen?.();
      }}
      onMouseEnter={() => send({ type: "HOVER" })}
      onMouseLeave={() => send({ type: "LEAVE" })}
    />
  );
}
