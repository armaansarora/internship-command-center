"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/ceo/character-machine";
import { AgentCharacterButton } from "@/components/visual-assets/AgentCharacterButton";

interface CEOCharacterProps {
  onConversationOpen?: () => void;
  externalState?: "idle" | "thinking" | "talking";
  dialogueOpen?: boolean;
}

export function CEOCharacter({
  onConversationOpen,
  externalState,
  dialogueOpen,
}: CEOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(characterMachine);
  const state = snapshot.value as string;

  useEffect(() => {
    if (dialogueOpen === false && snapshot.context.isConversationOpen) {
      send({ type: "DISMISS" });
    }
  }, [dialogueOpen, send, snapshot.context.isConversationOpen]);

  useEffect(() => {
    if (!dialogueOpen || !externalState) return;
    if (externalState === "thinking") {
      send({ type: "START_THINKING" });
      return;
    }
    if (externalState === "talking") {
      send({ type: "START_TALKING" });
      return;
    }
    send({ type: "STOP_TALKING" });
  }, [dialogueOpen, externalState, send]);

  const stateLabels: Record<string, string> = {
    idle: "CEO — Click to open executive briefing",
    alert: "CEO is noticing you",
    greeting: "CEO is greeting you",
    ready: "CEO is ready for your next direction",
    thinking: "CEO is formulating strategy",
    talking: "CEO is delivering briefing",
    returning: "CEO is stepping back",
  };

  return (
    <AgentCharacterButton
      characterId="ceo"
      state={state}
      label={stateLabels[state] ?? "CEO Character"}
      idleLabel="CEO"
      activeLabel="● CEO"
      isOpen={snapshot.context.isConversationOpen}
      accent="#C9A84C"
      onClick={() => {
        send({ type: "CLICK" });
        if (!snapshot.context.isConversationOpen) onConversationOpen?.();
      }}
      onMouseEnter={() => send({ type: "HOVER" })}
      onMouseLeave={() => send({ type: "LEAVE" })}
    />
  );
}
