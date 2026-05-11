import { assign } from "xstate";
import {
  createCharacterMachine,
  type BaseCharacterContext,
  type BaseCharacterEvent,
} from "@/lib/agents/create-character-machine";

export interface CNOCharacterContext extends BaseCharacterContext {
  coldAlerts: number;
}

export type CNOCharacterEvent =
  | BaseCharacterEvent
  | { type: "SET_COLD_ALERTS"; count: number };

export const cnoCharacterMachine = createCharacterMachine<
  CNOCharacterContext,
  CNOCharacterEvent
>({
  id: "cno-character",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    coldAlerts: 0,
  },
  idleOn: {
    SET_COLD_ALERTS: {
      actions: assign({
        coldAlerts: ({ event, context }) =>
          event.type === "SET_COLD_ALERTS" ? event.count : context.coldAlerts,
      }),
    },
  },
  alertOn: {
    SET_COLD_ALERTS: {
      actions: assign({
        coldAlerts: ({ event, context }) =>
          event.type === "SET_COLD_ALERTS" ? event.count : context.coldAlerts,
      }),
    },
  },
});
