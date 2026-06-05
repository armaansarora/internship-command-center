"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cro/character-machine";
import { AgentCharacterButton } from "@/components/visual-assets/AgentCharacterButton";

interface CROCharacterProps {
  onConversationOpen?: () => void;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CROCharacter({
  onConversationOpen,
  dialogueOpen,
  dialogueStatus,
}: CROCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const currentState = snapshot.value as string;

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
    send({ type: "STOP_TALKING" });
  }, [dialogueOpen, dialogueStatus, send]);

  const stateLabel: Record<string, string> = {
    idle: "CRO — Click to open pipeline review",
    alert: "CRO is noticing you — click to talk",
    greeting: "CRO is greeting you",
    ready: "CRO is ready — ask about your pipeline",
    thinking: "CRO is analyzing your pipeline",
    talking: "CRO is speaking",
    returning: "CRO is stepping back",
  };

  return (
    <AgentCharacterButton
      characterId="cro"
      state={currentState}
      label={stateLabel[currentState] ?? "CRO Character"}
      idleLabel="CRO"
      activeLabel="● CRO"
      isOpen={snapshot.context.isConversationOpen}
      accent="#1E90FF"
      priority
      onClick={() => {
        send({ type: "CLICK" });
        if (!snapshot.context.isConversationOpen) onConversationOpen?.();
      }}
      onMouseEnter={() => send({ type: "HOVER" })}
      onMouseLeave={() => send({ type: "LEAVE" })}
    />
  );
}
