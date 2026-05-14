"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { cnoCharacterMachine } from "@/lib/agents/cno/character-machine";
import { AgentCharacterButton } from "@/components/visual-assets/AgentCharacterButton";

interface CNOCharacterProps {
  onConversationOpen?: () => void;
  coldAlertsCount?: number;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function CNOCharacter({
  onConversationOpen,
  coldAlertsCount = 0,
  dialogueOpen,
  dialogueStatus,
}: CNOCharacterProps): JSX.Element {
  const [snapshot, send] = useActor(cnoCharacterMachine);
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
    idle: "CNO — Click to open networking review",
    alert: "CNO is noticing you — click to talk",
    greeting: "CNO is greeting you",
    ready: "CNO is ready — ask about your network",
    thinking: "CNO is analyzing your contacts",
    talking: "CNO is speaking",
    returning: "CNO is stepping back",
  };

  const badge = coldAlertsCount > 0 ? (
    <span
      aria-label={`${coldAlertsCount} contacts have gone quiet`}
      className="absolute top-0 right-0 flex items-center justify-center rounded-full"
      style={{
        width: "20px",
        height: "20px",
        backgroundColor: "#6E7E8F",
        color: "#FDF3E8",
        fontSize: "10px",
        fontFamily: "IBM Plex Mono, monospace",
        fontWeight: 700,
      }}
    >
      {coldAlertsCount}
    </span>
  ) : null;

  return (
    <AgentCharacterButton
      characterId="cno"
      state={currentState}
      label={stateLabel[currentState] ?? "CNO Character"}
      idleLabel="CNO"
      activeLabel="● CNO"
      isOpen={snapshot.context.isConversationOpen}
      accent="#C9A84C"
      badge={badge}
      onClick={() => {
        send({ type: "CLICK" });
        if (!snapshot.context.isConversationOpen) onConversationOpen?.();
      }}
      onMouseEnter={() => send({ type: "HOVER" })}
      onMouseLeave={() => send({ type: "LEAVE" })}
    />
  );
}
