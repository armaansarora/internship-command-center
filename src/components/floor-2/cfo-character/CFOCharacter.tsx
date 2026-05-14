"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/cfo/character-machine";
import { AgentCharacterButton } from "@/components/visual-assets/AgentCharacterButton";

interface CFOCharacterProps {
  onConversationOpen?: () => void;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CFOCharacter({
  onConversationOpen,
  dialogueOpen,
  dialogueStatus,
}: CFOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const state = snapshot.value as string;

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

  const stateLabels: Record<string, string> = {
    idle: "CFO — Click to open analytics review",
    alert: "CFO is noticing you — click to talk",
    greeting: "CFO is greeting you",
    ready: "CFO is ready to review your numbers",
    thinking: "CFO is analyzing data",
    talking: "CFO is speaking",
    returning: "CFO is stepping back",
  };

  return (
    <AgentCharacterButton
      characterId="cfo"
      state={state}
      label={stateLabels[state] ?? "CFO Character"}
      idleLabel="CFO"
      activeLabel="● CFO"
      isOpen={snapshot.context.isConversationOpen}
      accent="#64B4FF"
      onClick={() => {
        send({ type: "CLICK" });
        if (!snapshot.context.isConversationOpen) onConversationOpen?.();
      }}
      onMouseEnter={() => send({ type: "HOVER" })}
      onMouseLeave={() => send({ type: "LEAVE" })}
    />
  );
}
