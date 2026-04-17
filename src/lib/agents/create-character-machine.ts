import { assign, setup } from "xstate";

export interface BaseCharacterContext {
  isConversationOpen: boolean;
  hasGreeted: boolean;
}

export type BaseCharacterEvent =
  | { type: "HOVER" }
  | { type: "CLICK" }
  | { type: "LEAVE" }
  | { type: "START_THINKING" }
  | { type: "START_TALKING" }
  | { type: "STOP_TALKING" }
  | { type: "DISMISS" };

type TransitionMap = Record<string, unknown>;
type StateMap = Record<string, unknown>;

interface CreateCharacterMachineOptions<
  TContext extends BaseCharacterContext,
> {
  id: string;
  context: TContext;
  idleOn?: TransitionMap;
  alertOn?: TransitionMap;
  readyOn?: TransitionMap;
  thinkingOn?: TransitionMap;
  talkingOn?: TransitionMap;
  extraStates?: StateMap;
  returningContext?: Partial<TContext>;
}

export function createCharacterMachine<
  TContext extends BaseCharacterContext,
  TEvent extends { type: string },
>({
  id,
  context,
  idleOn,
  alertOn,
  readyOn,
  thinkingOn,
  talkingOn,
  extraStates,
  returningContext,
}: CreateCharacterMachineOptions<TContext>) {
  return setup({
    types: {
      context: {} as TContext,
      events: {} as TEvent | BaseCharacterEvent,
    },
    delays: {
      alertDelay: 300,
      greetingDelay: 500,
      returningDelay: 400,
    },
  }).createMachine({
    id,
    initial: "idle",
    context,
    states: {
      idle: {
        meta: { animation: "idle" },
        on: {
          HOVER: { target: "alert" },
          CLICK: { target: "greeting" },
          ...idleOn,
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
          ...alertOn,
        },
      },
      greeting: {
        meta: { animation: "greeting" },
        entry: assign(({ context }) => ({
          ...context,
          isConversationOpen: true,
          hasGreeted: true,
        })),
        after: {
          greetingDelay: { target: "ready" },
        },
      },
      ready: {
        meta: { animation: "ready" },
        on: {
          START_THINKING: { target: "thinking" },
          DISMISS: { target: "returning" },
          ...readyOn,
        },
      },
      thinking: {
        meta: { animation: "thinking" },
        on: {
          START_TALKING: { target: "talking" },
          STOP_TALKING: { target: "ready" },
          DISMISS: { target: "returning" },
          ...thinkingOn,
        },
      },
      talking: {
        meta: { animation: "talking" },
        on: {
          STOP_TALKING: { target: "ready" },
          DISMISS: { target: "returning" },
          ...talkingOn,
        },
      },
      ...extraStates,
      returning: {
        meta: { animation: "returning" },
        entry: assign(({ context }) => ({
          ...context,
          isConversationOpen: false,
          ...(returningContext ?? {}),
        })),
        after: {
          returningDelay: { target: "idle" },
        },
      },
    },
  });
}
