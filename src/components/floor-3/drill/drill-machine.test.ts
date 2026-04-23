import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { drillMachine, type DrillQuestion } from "./drill-machine";

const Q: DrillQuestion[] = [
  { id: "q1", text: "Tell me about X", category: "behavioral", rubric: "S/T/A/R" },
  { id: "q2", text: "Tell me about Y", category: "behavioral", rubric: "S/T/A/R" },
  { id: "q3", text: "Tell me about Z", category: "case", rubric: "S/T/A/R" },
];

describe("drill-machine", () => {
  it("starts in idle; START transitions to asking", () => {
    const actor = createActor(drillMachine).start();
    expect(actor.getSnapshot().value).toBe("idle");
    actor.send({ type: "START", drillId: "d1", questions: Q });
    expect(actor.getSnapshot().value).toBe("asking");
  });

  it("asking → answering on BEGIN_ANSWER", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    expect(actor.getSnapshot().value).toBe("answering");
  });

  it("answering stores text on UPDATE_TEXT", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    actor.send({ type: "UPDATE_TEXT", text: "I built a bot." });
    expect(actor.getSnapshot().context.currentText).toBe("I built a bot.");
  });

  it("COMPLETE_ANSWER → scoring", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    actor.send({ type: "UPDATE_TEXT", text: "I built a bot." });
    actor.send({ type: "COMPLETE_ANSWER" });
    expect(actor.getSnapshot().value).toBe("scoring");
  });

  it("SCORE_DONE advances to next question (asking) when more remain", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    actor.send({ type: "UPDATE_TEXT", text: "I did a thing." });
    actor.send({ type: "COMPLETE_ANSWER" });
    actor.send({ type: "SCORE_DONE", score: 80, stars: { s: 70, t: 70, a: 80, r: 60 }, narrative: "ok" });
    expect(actor.getSnapshot().value).toBe("asking");
    expect(actor.getSnapshot().context.currentIndex).toBe(1);
    expect(actor.getSnapshot().context.answers).toHaveLength(1);
  });

  it("after 3 scored answers, transitions to complete", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    for (let i = 0; i < 3; i++) {
      actor.send({ type: "BEGIN_ANSWER" });
      actor.send({ type: "UPDATE_TEXT", text: "I did a thing." });
      actor.send({ type: "COMPLETE_ANSWER" });
      actor.send({ type: "SCORE_DONE", score: 80, stars: { s: 70, t: 70, a: 80, r: 60 }, narrative: "ok" });
    }
    expect(actor.getSnapshot().value).toBe("complete");
    expect(actor.getSnapshot().context.answers).toHaveLength(3);
  });

  it("RESET from complete returns to idle", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    for (let i = 0; i < 3; i++) {
      actor.send({ type: "BEGIN_ANSWER" });
      actor.send({ type: "UPDATE_TEXT", text: "done." });
      actor.send({ type: "COMPLETE_ANSWER" });
      actor.send({ type: "SCORE_DONE", score: 70, stars: { s: 60, t: 60, a: 70, r: 50 }, narrative: "" });
    }
    expect(actor.getSnapshot().value).toBe("complete");
    actor.send({ type: "RESET" });
    expect(actor.getSnapshot().value).toBe("idle");
  });

  it("records interrupts in the current answer", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    actor.send({ type: "INTERRUPT", interruptType: "no_action_verb", atMs: 32_000 });
    actor.send({ type: "INTERRUPT", interruptType: "wrapping_up", atMs: 92_000 });
    actor.send({ type: "UPDATE_TEXT", text: "I tried." });
    actor.send({ type: "COMPLETE_ANSWER" });
    actor.send({ type: "SCORE_DONE", score: 50, stars: { s: 40, t: 40, a: 40, r: 30 }, narrative: "" });
    expect(actor.getSnapshot().context.answers[0].interrupts).toHaveLength(2);
    expect(actor.getSnapshot().context.answers[0].interrupts[0].type).toBe("no_action_verb");
  });

  it("setAudioPath attaches audio to the in-progress answer", () => {
    const actor = createActor(drillMachine).start();
    actor.send({ type: "START", drillId: "d1", questions: Q });
    actor.send({ type: "BEGIN_ANSWER" });
    actor.send({ type: "SET_AUDIO_PATH", path: "user-1/drill-1/q1.webm" });
    actor.send({ type: "UPDATE_TEXT", text: "transcribed text" });
    actor.send({ type: "COMPLETE_ANSWER" });
    actor.send({ type: "SCORE_DONE", score: 75, stars: { s: 70, t: 60, a: 80, r: 60 }, narrative: "" });
    expect(actor.getSnapshot().context.answers[0].audioPath).toBe("user-1/drill-1/q1.webm");
  });
});
