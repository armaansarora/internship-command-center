import type { ActorRef, Snapshot } from "xstate";
import {
  createCharacterMachine,
  type BaseCharacterContext,
  type BaseCharacterEvent,
} from "@/lib/agents/create-character-machine";

export interface CIOCharacterContext extends BaseCharacterContext {
  unreadAlerts: number;
}

export type CIOCharacterEvent = BaseCharacterEvent;

export const cioCharacterMachine = createCharacterMachine<
  CIOCharacterContext,
  CIOCharacterEvent
>({
  id: "cio-character",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    unreadAlerts: 0,
  },
});

export type CIOCharacterActorRef = ActorRef<
  Snapshot<CIOCharacterContext>,
  CIOCharacterEvent
>;

export type CIOCharacterSnapshot = Snapshot<CIOCharacterContext> & {
  value:
    | "idle"
    | "alert"
    | "greeting"
    | "ready"
    | "thinking"
    | "talking"
    | "returning";
};
