import { assign } from "xstate";
import type { ActorRef, Snapshot } from "xstate";
import {
  createCharacterMachine,
  type BaseCharacterContext,
  type BaseCharacterEvent,
} from "@/lib/agents/create-character-machine";

export interface CharacterContext extends BaseCharacterContext {
  unreadAlerts: number;
  isBriefing: boolean;
}

export type CharacterEvent =
  | BaseCharacterEvent
  | { type: "START_BRIEFING" }
  | { type: "STOP_BRIEFING" };

export const characterMachine = createCharacterMachine<
  CharacterContext,
  CharacterEvent
>({
  id: "cpo-character",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    unreadAlerts: 0,
    isBriefing: false,
  },
  readyOn: {
    START_BRIEFING: { target: "briefing" },
  },
  thinkingOn: {
    START_BRIEFING: { target: "briefing" },
  },
  talkingOn: {
    START_BRIEFING: { target: "briefing" },
  },
  extraStates: {
    briefing: {
      meta: { animation: "briefing" },
      entry: assign({
        isBriefing: true,
      }),
      exit: assign({
        isBriefing: false,
      }),
      on: {
        STOP_BRIEFING: { target: "talking" },
        STOP_TALKING: { target: "ready" },
        DISMISS: { target: "returning" },
      },
    },
  },
  returningContext: {
    isBriefing: false,
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
    | "briefing"
    | "returning";
};
