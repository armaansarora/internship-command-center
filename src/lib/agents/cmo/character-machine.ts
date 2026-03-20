import { setup, assign } from "xstate";
import type { ActorRef, Snapshot } from "xstate";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface CharacterContext {
  isConversationOpen: boolean;
  hasGreeted: boolean;
  unreadAlerts: number;
  isWriting: boolean;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export type CharacterEvent =
  | { type: "HOVER" }
  | { type: "CLICK" }
  | { type: "LEAVE" }
  | { type: "START_THINKING" }
  | { type: "START_TALKING" }
  | { type: "STOP_TALKING" }
  | { type: "START_WRITING" }
  | { type: "STOP_WRITING" }
  | { type: "DISMISS" };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------
export const characterMachine = setup({
  types: {
    context: {} as CharacterContext,
    events: {} as CharacterEvent,
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
  id: "cmo-character",
  initial: "idle",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    unreadAlerts: 0,
    isWriting: false,
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
        START_WRITING: { target: "writing" },
        DISMISS: { target: "returning" },
      },
    },

    thinking: {
      meta: { animation: "thinking" },
      on: {
        START_TALKING: { target: "talking" },
        START_WRITING: { target: "writing" },
        DISMISS: { target: "returning" },
      },
    },

    talking: {
      meta: { animation: "talking" },
      on: {
        STOP_TALKING: { target: "ready" },
        START_WRITING: { target: "writing" },
        DISMISS: { target: "returning" },
      },
    },

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

    returning: {
      meta: { animation: "returning" },
      entry: assign({
        isConversationOpen: false,
        isWriting: false,
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

/** The actor reference type for the CMO character machine */
export type CharacterActorRef = ActorRef<
  Snapshot<CharacterContext>,
  CharacterEvent
>;

/** Snapshot type for the CMO character machine */
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
