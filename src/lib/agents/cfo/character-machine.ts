import type { ActorRef, Snapshot } from "xstate";
import {
  createCharacterMachine,
  type BaseCharacterEvent,
  type BaseCharacterContext,
} from "@/lib/agents/create-character-machine";

export interface CharacterContext extends BaseCharacterContext {
  unreadAlerts: number;
}

export type CharacterEvent = BaseCharacterEvent;

export const characterMachine = createCharacterMachine<CharacterContext, CharacterEvent>({
  id: "cfo-character",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    unreadAlerts: 0,
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
    | "returning";
};
