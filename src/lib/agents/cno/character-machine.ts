import { setup, assign } from "xstate";
import type { ActorRef, Snapshot } from "xstate";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface CNOCharacterContext {
  isConversationOpen: boolean;
  hasGreeted: boolean;
  coldAlerts: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export type CNOCharacterEvent =
  | { type: "HOVER" }
  | { type: "CLICK" }
  | { type: "LEAVE" }
  | { type: "START_THINKING" }
  | { type: "START_TALKING" }
  | { type: "STOP_TALKING" }
  | { type: "DISMISS" }
  | { type: "SET_COLD_ALERTS"; count: number };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const cnoCharacterMachine = setup({
  types: {
    context: {} as CNOCharacterContext,
    events: {} as CNOCharacterEvent,
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
  id: "cno-character",
  initial: "idle",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    coldAlerts: 0,
  },
  states: {
    idle: {
      meta: { animation: "idle" },
      on: {
        HOVER: { target: "alert" },
        CLICK: { target: "greeting" },
        SET_COLD_ALERTS: {
          actions: assign({ coldAlerts: ({ event }) => event.count }),
        },
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
        SET_COLD_ALERTS: {
          actions: assign({ coldAlerts: ({ event }) => event.count }),
        },
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

/** The actor reference type for the CNO character machine */
export type CNOCharacterActorRef = ActorRef<
  Snapshot<CNOCharacterContext>,
  CNOCharacterEvent
>;

/** Snapshot type for the CNO character machine */
export type CNOCharacterSnapshot = Snapshot<CNOCharacterContext> & {
  value:
    | "idle"
    | "alert"
    | "greeting"
    | "ready"
    | "thinking"
    | "talking"
    | "returning";
};
