"use client";

import { useCallback, useMemo } from "react";
import { useActor } from "@xstate/react";
import { useCROChat } from "@/hooks/useCROChat";
import { characterMachine } from "@/lib/agents/cro/character-machine";
import type { CharacterSnapshot, CharacterEvent } from "@/lib/agents/cro/character-machine";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export interface UseCharacterOptions {
  id: string;
  apiEndpoint: string;
  defaultMessage?: string;
}

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------
export interface UseCharacterReturn {
  /** Current XState machine snapshot */
  snapshot: CharacterSnapshot;
  /** Dispatch events to the XState machine */
  send: (event: CharacterEvent) => void;
  /** Chat state — messages, input, status, etc. */
  chat: ReturnType<typeof useCROChat>;
  /** Whether the dialogue panel is open */
  isConversationOpen: boolean;
  /** Open the conversation (triggers greeting → ready) */
  openConversation: () => void;
  /** Close the conversation (transitions to returning → idle) */
  closeConversation: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useCharacter(options: UseCharacterOptions): UseCharacterReturn {
  const { id, apiEndpoint } = options;

  const [snapshot, send] = useActor(characterMachine);

  const chat = useCROChat({
    id,
    api: apiEndpoint,
  });

  const isConversationOpen = snapshot.context.isConversationOpen;

  const openConversation = useCallback(() => {
    send({ type: "CLICK" });
  }, [send]);

  const closeConversation = useCallback(() => {
    send({ type: "DISMISS" });
  }, [send]);

  return useMemo(
    () => ({
      snapshot: snapshot as CharacterSnapshot,
      send,
      chat,
      isConversationOpen,
      openConversation,
      closeConversation,
    }),
    [snapshot, send, chat, isConversationOpen, openConversation, closeConversation]
  );
}
