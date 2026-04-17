import { assign } from "xstate";
import type { ActorRef, Snapshot } from "xstate";
import {
  createCharacterMachine,
  type BaseCharacterContext,
  type BaseCharacterEvent,
} from "@/lib/agents/create-character-machine";

export interface CharacterContext extends BaseCharacterContext {
  unreadAlerts: number;
  isWriting: boolean;
}

export type CharacterEvent =
  | BaseCharacterEvent
  | { type: "START_WRITING" }
  | { type: "STOP_WRITING" };

export const characterMachine = createCharacterMachine<
  CharacterContext,
  CharacterEvent
>({
  id: "cmo-character",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    unreadAlerts: 0,
    isWriting: false,
  },
  readyOn: {
    START_WRITING: { target: "writing" },
  },
  thinkingOn: {
    START_WRITING: { target: "writing" },
  },
  talkingOn: {
    START_WRITING: { target: "writing" },
  },
  extraStates: {
    writing: {
      meta: { animation: "writing" },
      entry: assign({
        isWriting: true,
      }),
      on: {
        STOP_WRITING: { target: "talking" },
        DISMISS: { target: "returning" },
      },
      exit: assign({
        isWriting: false,
      }),
    },
  },
  returningContext: {
    isWriting: false,
  },
});

export type CharacterActorRef = ActorRef<
  Snapshot<CharacterContext>,
  CharacterEvent
>;

export type CharacterSnapshot = Snapshot<CharacterContext> & {
  value:
    | "idle"
    | "alert"
    | "greeting"
    | "ready"
    | "thinking"
    | "talking"
    | "writing"
    | "returning";
};
