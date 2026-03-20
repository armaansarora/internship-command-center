import { setup, assign } from "xstate";
import type { ActorRef, Snapshot } from "xstate";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface CIOCharacterContext {
  isConversationOpen: boolean;
  hasGreeted: boolean;
  unreadAlerts: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export type CIOCharacterEvent =
  | { type: "HOVER" }
  | { type: "CLICK" }
  | { type: "LEAVE" }
  | { type: "START_THINKING" }
  | { type: "START_TALKING" }
  | { type: "STOP_TALKING" }
  | { type: "DISMISS" };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const cioCharacterMachine = setup({
  types: {
    context: {} as CIOCharacterContext,
    events: {} as CIOCharacterEvent,
  },
  guards: {
    hasClickedBefore: ({ context }) => context.hasGreeted,
  },
  delays: {
    alertDelay: 300,
    greetingDelay: 500,
    returningDelay: 400,
  },
}).createMachine({
  id: "cio-character",
  initial: "idle",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    unreadAlerts: 0,
  },
  states: {
    idle: {
      meta: { animation: "idle" },
      on: {
        HOVER: { target: "alert" },
        CLICK: { target: "greeting" },
      },
    },

    alert: {
      meta: { animation: "alert" },
      after: {
        alertDelay: { target: "idle" },
      },
      on: {
        CLICK: { target: "greeting" },
        LEAVE: { target: "idle" },
      },
    },

    greeting: {
      meta: { animation: "greeting" },
      entry: assign({
        isConversationOpen: true,
        hasGreeted: true,
      }),
      after: {
        greetingDelay: { target: "ready" },
      },
    },

    ready: {
      meta: { animation: "ready" },
      on: {
        START_THINKING: { target: "thinking" },
        DISMISS: { target: "returning" },
      },
    },

    thinking: {
      meta: { animation: "thinking" },
      on: {
        START_TALKING: { target: "talking" },
        DISMISS: { target: "returning" },
      },
    },

    talking: {
      meta: { animation: "talking" },
      on: {
        STOP_TALKING: { target: "ready" },
        DISMISS: { target: "returning" },
      },
    },

    returning: {
      meta: { animation: "returning" },
      entry: assign({
        isConversationOpen: false,
      }),
      after: {
        returningDelay: { target: "idle" },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

/** The actor reference type for the CIO character machine */
export type CIOCharacterActorRef = ActorRef<
  Snapshot<CIOCharacterContext>,
  CIOCharacterEvent
>;

/** Snapshot type for the CIO character machine */
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
