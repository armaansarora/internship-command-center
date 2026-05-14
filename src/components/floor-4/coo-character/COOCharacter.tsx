"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useActor } from "@xstate/react";
import { characterMachine } from "@/lib/agents/coo/character-machine";
import { AgentCharacterButton } from "@/components/visual-assets/AgentCharacterButton";

interface COOCharacterProps {
  onConversationOpen?: () => void;
  overdueCount?: number;
  dialogueOpen?: boolean;
  dialogueStatus?: "idle" | "thinking" | "talking";
}

export function COOCharacter({
  onConversationOpen,
  overdueCount = 0,
  dialogueOpen,
  dialogueStatus,
}: COOCharacterProps): JSX.Element {
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
    idle: "COO Dylan Shorts — Click to open operations briefing",
    alert: "COO is noticing you — click to talk",
    greeting: "COO is greeting you",
    ready: "COO is ready — ask about your deadlines",
    thinking: "COO is reviewing your calendar",
    talking: "COO is briefing you",
    returning: "COO is stepping back",
  };

  const badge = overdueCount > 0 ? (
    <span
      aria-label={`${overdueCount} overdue follow-ups`}
      className="absolute top-0 right-0 flex items-center justify-center rounded-full"
      style={{
        width: "22px",
        height: "22px",
        backgroundColor: "#DC3C3C",
        color: "#FDF3E8",
        fontSize: "10px",
        fontFamily: "IBM Plex Mono, monospace",
        fontWeight: 700,
      }}
    >
      {overdueCount > 9 ? "9+" : overdueCount}
    </span>
  ) : null;

  return (
    <AgentCharacterButton
      characterId="coo"
      state={currentState}
      label={stateLabel[currentState] ?? "COO Character"}
      idleLabel="COO"
      activeLabel="● COO"
      isOpen={snapshot.context.isConversationOpen}
      accent="#DC7C28"
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
