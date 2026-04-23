import { setup, assign } from "xstate";

export interface DrillQuestion {
  id: string;
  text: string;
  category: "behavioral" | "technical" | "culture-fit" | "case";
  rubric: string;
}

export interface DrillAnswerRecord {
  questionId: string;
  text: string;
  durationMs: number;
  score: number;
  stars: { s: number; t: number; a: number; r: number };
  narrative: string;
  interrupts: { type: string; atMs: number }[];
  audioPath: string | null;
}

interface Ctx {
  drillId: string;
  questions: DrillQuestion[];
  currentIndex: number;
  currentText: string;
  answerStartedAt: number | null;
  interrupts: { type: string; atMs: number }[];
  answers: DrillAnswerRecord[];
  audioPath: string | null;
}

type Evt =
  | { type: "START"; drillId: string; questions: DrillQuestion[] }
  | { type: "BEGIN_ANSWER" }
  | { type: "UPDATE_TEXT"; text: string }
  | { type: "INTERRUPT"; interruptType: string; atMs: number }
  | { type: "SET_AUDIO_PATH"; path: string | null }
  | { type: "COMPLETE_ANSWER" }
  | { type: "SCORE_DONE"; score: number; stars: { s: number; t: number; a: number; r: number }; narrative: string }
  | { type: "RESET" };

export const drillMachine = setup({
  types: { context: {} as Ctx, events: {} as Evt },
  actions: {
    startDrill: assign(({ event }) => {
      if (event.type !== "START") return {};
      return {
        drillId: event.drillId,
        questions: event.questions,
        currentIndex: 0,
        currentText: "",
        answers: [],
        interrupts: [],
        answerStartedAt: null,
        audioPath: null,
      };
    }),
    beginAnswer: assign({ answerStartedAt: () => Date.now(), currentText: "", interrupts: [], audioPath: null }),
    updateText: assign({
      currentText: ({ event }) => (event.type === "UPDATE_TEXT" ? event.text : ""),
    }),
    recordInterrupt: assign({
      interrupts: ({ context, event }) =>
        event.type === "INTERRUPT"
          ? [...context.interrupts, { type: event.interruptType, atMs: event.atMs }]
          : context.interrupts,
    }),
    setAudioPath: assign({
      audioPath: ({ event }) => (event.type === "SET_AUDIO_PATH" ? event.path : null),
    }),
    finalizeAnswer: assign(({ context, event }) => {
      if (event.type !== "SCORE_DONE") return {};
      const q = context.questions[context.currentIndex];
      const durationMs = context.answerStartedAt ? Date.now() - context.answerStartedAt : 0;
      const record: DrillAnswerRecord = {
        questionId: q.id,
        text: context.currentText,
        durationMs,
        score: event.score,
        stars: event.stars,
        narrative: event.narrative,
        interrupts: context.interrupts,
        audioPath: context.audioPath,
      };
      return {
        answers: [...context.answers, record],
        currentIndex: context.currentIndex + 1,
        currentText: "",
        answerStartedAt: null,
        interrupts: [],
        audioPath: null,
      };
    }),
  },
  guards: {
    hasMoreQuestions: ({ context }) => context.currentIndex < context.questions.length - 1,
  },
}).createMachine({
  id: "drill",
  initial: "idle",
  context: {
    drillId: "",
    questions: [],
    currentIndex: 0,
    currentText: "",
    answerStartedAt: null,
    interrupts: [],
    answers: [],
    audioPath: null,
  },
  states: {
    idle: {
      on: { START: { target: "asking", actions: "startDrill" } },
    },
    asking: {
      on: { BEGIN_ANSWER: { target: "answering", actions: "beginAnswer" } },
    },
    answering: {
      on: {
        UPDATE_TEXT: { actions: "updateText" },
        INTERRUPT: { actions: "recordInterrupt" },
        SET_AUDIO_PATH: { actions: "setAudioPath" },
        COMPLETE_ANSWER: { target: "scoring" },
      },
    },
    scoring: {
      on: {
        SCORE_DONE: [
          { target: "asking", guard: "hasMoreQuestions", actions: "finalizeAnswer" },
          { target: "complete", actions: "finalizeAnswer" },
        ],
      },
    },
    complete: {
      on: { RESET: { target: "idle" } },
    },
  },
});
