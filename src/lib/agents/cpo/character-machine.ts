import { setup, assign } from "xstate";
import type { ActorRef, Snapshot } from "xstate";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface CharacterContext {
  isConversationOpen: boolean;
  hasGreeted: boolean;
  unreadAlerts: number;
  /** True when the CPO is presenting a prep packet to the user */
  isBriefing: boolean;
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
  | { type: "START_BRIEFING" }
  | { type: "STOP_BRIEFING" }
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
  id: "cpo-character",
  initial: "idle",
  context: {
    isConversationOpen: false,
    hasGreeted: false,
    unreadAlerts: 0,
    isBriefing: false,
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
        START_BRIEFING: { target: "briefing" },
        DISMISS: { target: "returning" },
      },
    },

    thinking: {
      meta: { animation: "thinking" },
      on: {
        START_TALKING: { target: "talking" },
        START_BRIEFING: { target: "briefing" },
        DISMISS: { target: "returning" },
      },
    },

    talking: {
      meta: { animation: "talking" },
      on: {
        STOP_TALKING: { target: "ready" },
        START_BRIEFING: { target: "briefing" },
        DISMISS: { target: "returning" },
      },
    },

    /**
     * briefing — unique to CPO.
     * Entered when the CPO is presenting a prep packet to the user.
     * The character enters a focused, presenting mode — flipping through
     * materials, pointing at the wall, running through question frameworks.
     */
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

    returning: {
      meta: { animation: "returning" },
      entry: assign({
        isConversationOpen: false,
        isBriefing: false,
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

/** The actor reference type for the CPO character machine */
export type CharacterActorRef = ActorRef<
  Snapshot<CharacterContext>,
  CharacterEvent
>;

/** Snapshot type for the CPO character machine */
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
