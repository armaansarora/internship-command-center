"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActor } from "@xstate/react";
import { drillMachine, type DrillQuestion } from "./drill-machine";
import { DrillQuestionCard } from "./DrillQuestionCard";
import { DrillTimer } from "./DrillTimer";
import { InterruptBubble } from "./InterruptBubble";
import { DrillVoiceMic } from "./DrillVoiceMic";
import { LiveSTARBoard } from "./LiveSTARBoard";
import { extractStar, type StarHints } from "../star/extract-star";
import {
  nextInterrupt,
  type DrillState,
  type Firmness,
  type InterruptTrigger,
} from "../star/interrupt-rules";
import type { DebriefContent } from "@/types/debrief";

/**
 * R6.6 — DrillStage.
 *
 * The Intent-level centerpiece of the Briefing Room. Wires the drill
 * machine, live STAR extraction, CPO's mid-answer interrupt engine, and
 * the three server routes (start-drill, score-answer, complete-drill).
 *
 * Invariants (partner binding constraint — "Intent-level MUST ship"):
 *   - textarea input updates the LiveSTARBoard via `extractStar`
 *   - the interrupt engine ticks every second and surfaces an
 *     InterruptBubble when `nextInterrupt` fires
 *   - the timer goes amber at 90s, red at 120s (see timerColor)
 *   - the voice mic renders only when voice is enabled AND not
 *     permanently disabled (shouldShowVoiceToggle)
 */

const EMPTY_HINTS: StarHints = { situation: [], task: [], action: [], result: [] };

const STAR_WEIGHTS = { s: 0.15, t: 0.15, a: 0.5, r: 0.2 } as const;
function starScore(hints: StarHints): DrillState["stars"] {
  // Each column is 100 when saturated (>= 3 hits), scaled linearly otherwise.
  const cap = 3;
  const bucket = (arr: string[]): number => Math.min(100, Math.round((arr.length / cap) * 100));
  return {
    s: bucket(hints.situation),
    t: bucket(hints.task),
    a: bucket(hints.action),
    r: bucket(hints.result),
  };
}

function wordCount(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

interface StartDrillResponse {
  drillId: string;
  interviewId: string;
  company: string;
  round: string;
  questions: DrillQuestion[];
}

interface ScoreResponse {
  stars: { s: number; t: number; a: number; r: number };
  score: number;
  narrative: string;
  nudge: string;
}

interface CompleteResponse {
  binderId: string;
}

export interface DrillStageProps {
  interviewId: string;
  voiceEnabled: boolean;
  voicePermDisabled: boolean;
  firmness: Firmness;
  timerSeconds: number;
  onComplete: (binderId: string) => void;
  onExit?: () => void;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: StartDrillResponse };

export function DrillStage(props: DrillStageProps): JSX.Element {
  const {
    interviewId,
    voiceEnabled,
    voicePermDisabled,
    firmness,
    timerSeconds,
    onComplete,
    onExit,
  } = props;

  const [snapshot, send] = useActor(drillMachine);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [text, setText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastInterruptAtMs, setLastInterruptAtMs] = useState<number | null>(null);
  const [currentInterrupt, setCurrentInterrupt] = useState<InterruptTrigger | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const answerStartRef = useRef<number | null>(null);

  const snapshotValue = snapshot.value;
  const ctx = snapshot.context;
  const questions = ctx.questions;
  const currentIndex = ctx.currentIndex;
  const currentQuestion =
    questions.length > 0 && currentIndex < questions.length
      ? questions[currentIndex]
      : null;

  // ── Start the drill once on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const res = await fetch(`/api/briefing/start-drill`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ interviewId }),
        });
        if (!res.ok) throw new Error(`start ${res.status}`);
        const data = (await res.json()) as StartDrillResponse;
        if (cancelled) return;
        setLoadState({ kind: "ready", data });
        send({ type: "START", drillId: data.drillId, questions: data.questions });
        send({ type: "BEGIN_ANSWER" });
        answerStartRef.current = Date.now();
      } catch (err) {
        if (!cancelled) {
          setLoadState({ kind: "error", message: (err as Error).message });
        }
      }
    }
    void run();
    return (): void => {
      cancelled = true;
    };
    // `send` is stable from useActor; interviewId is the only real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  // ── Tick elapsed + run interrupt engine once per second ────────────
  useEffect(() => {
    if (snapshotValue !== "answering") return;
    const id = setInterval(() => {
      if (answerStartRef.current === null) return;
      const now = Date.now() - answerStartRef.current;
      setElapsedMs(now);
    }, 1000);
    return (): void => clearInterval(id);
  }, [snapshotValue, currentIndex]);

  // ── Live STAR extraction on text change ────────────────────────────
  const hints = useMemo<StarHints>(
    () => (text ? extractStar(text) : EMPTY_HINTS),
    [text],
  );
  const stars = useMemo(() => starScore(hints), [hints]);

  // ── Interrupt engine — pure trigger derived from elapsed + stars ───
  useEffect(() => {
    if (snapshotValue !== "answering") return;
    if (currentInterrupt) return; // one at a time; candidate must dismiss
    const isFirst = currentIndex === 0;
    const trigger = nextInterrupt({
      elapsedMs,
      lastInterruptAtMs,
      firmness,
      isFirstQuestion: isFirst,
      wordCount: wordCount(text),
      stars,
    });
    if (trigger) {
      setCurrentInterrupt(trigger);
      setLastInterruptAtMs(elapsedMs);
      send({ type: "INTERRUPT", interruptType: trigger.type, atMs: elapsedMs });
    }
  }, [
    snapshotValue,
    elapsedMs,
    text,
    stars,
    lastInterruptAtMs,
    currentInterrupt,
    currentIndex,
    firmness,
    send,
  ]);

  // ── Reset per-question local state when question index advances ────
  useEffect(() => {
    if (snapshotValue !== "answering") return;
    setText("");
    setElapsedMs(0);
    setLastInterruptAtMs(null);
    setCurrentInterrupt(null);
    answerStartRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, snapshotValue]);

  const handleTextChange = useCallback(
    (v: string) => {
      setText(v);
      send({ type: "UPDATE_TEXT", text: v });
    },
    [send],
  );

  const handleTranscribed = useCallback(
    (transcribed: string, path: string) => {
      setText(transcribed);
      send({ type: "UPDATE_TEXT", text: transcribed });
      send({ type: "SET_AUDIO_PATH", path });
    },
    [send],
  );

  const handleDismissInterrupt = useCallback(() => {
    setCurrentInterrupt(null);
  }, []);

  // ── Done-with-answer — score this answer, machine advances itself ──
  const handleDoneAnswer = useCallback(async () => {
    if (loadState.kind !== "ready") return;
    if (!currentQuestion) return;
    if (submitting) return;
    if (!text.trim()) return;
    setSubmitting(true);
    setScoreError(null);
    try {
      const res = await fetch(`/api/briefing/score-answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          drillId: loadState.data.drillId,
          questionId: currentQuestion.id,
          question: currentQuestion.text,
          rubric: currentQuestion.rubric,
          answer: text,
        }),
      });
      if (!res.ok) throw new Error(`score ${res.status}`);
      const result = (await res.json()) as ScoreResponse;
      send({ type: "COMPLETE_ANSWER" });
      send({
        type: "SCORE_DONE",
        score: result.score,
        stars: result.stars,
        narrative: result.narrative,
      });
    } catch (err) {
      setScoreError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [loadState, currentQuestion, submitting, text, send]);

  // ── When machine reaches "complete", POST the debrief ──────────────
  const finalizedRef = useRef(false);
  useEffect(() => {
    if (snapshotValue !== "complete") return;
    if (finalizedRef.current) return;
    if (loadState.kind !== "ready") return;
    finalizedRef.current = true;
    const { data } = loadState;

    const totalScore =
      ctx.answers.length === 0
        ? 0
        : Math.round(
            ctx.answers.reduce((acc, a) => acc + a.score, 0) / ctx.answers.length,
          );

    const debrief: DebriefContent = {
      source: "drill",
      interviewId: data.interviewId,
      company: data.company,
      round: data.round,
      questions: ctx.answers.map((a) => {
        const q = questions.find((x) => x.id === a.questionId);
        return {
          id: a.questionId,
          text: q?.text ?? "",
          category: q?.category ?? "behavioral",
          answer: {
            text: a.text,
            durationMs: a.durationMs,
            audioPath: a.audioPath,
          },
          stars: a.stars,
          score: a.score,
          narrative: a.narrative,
          interrupts: a.interrupts.map((it) => ({
            type: it.type as DebriefContent["questions"][number]["interrupts"][number]["type"],
            atMs: it.atMs,
          })),
        };
      }),
      totalScore,
      cpoFeedback:
        totalScore >= 80
          ? "Tight answers. You closed the STAR loop under pressure. Keep this bar."
          : totalScore >= 60
          ? "Solid foundation. Sharpen the Action verbs and land the Result with a number."
          : "Rework this loop. Your Actions are thin and Results are vague. We drill again.",
      createdAt: new Date().toISOString(),
    };

    (async (): Promise<void> => {
      try {
        const res = await fetch(`/api/briefing/complete-drill`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ interviewId: data.interviewId, debrief }),
        });
        if (!res.ok) throw new Error(`complete ${res.status}`);
        const { binderId } = (await res.json()) as CompleteResponse;
        onComplete(binderId);
      } catch (err) {
        setScoreError((err as Error).message);
      }
    })();
  }, [snapshotValue, loadState, ctx.answers, questions, onComplete]);

  // ── Render branches ────────────────────────────────────────────────
  if (loadState.kind === "loading") {
    return (
      <section
        role="region"
        aria-label="CPO drill stage"
        aria-busy="true"
        style={drillShellStyle}
      >
        <p style={loaderLabelStyle}>Loading drill…</p>
      </section>
    );
  }

  if (loadState.kind === "error") {
    return (
      <section role="region" aria-label="CPO drill stage" style={drillShellStyle}>
        <p style={{ ...loaderLabelStyle, color: "#DC3C3C" }}>
          Could not start drill: {loadState.message}
        </p>
        {onExit && (
          <button type="button" onClick={onExit} style={ghostButtonStyle}>
            Exit drill
          </button>
        )}
      </section>
    );
  }

  if (snapshotValue === "complete" || snapshotValue === "scoring") {
    return (
      <section role="region" aria-label="CPO drill stage" style={drillShellStyle}>
        <p style={loaderLabelStyle}>
          {snapshotValue === "scoring" ? "CPO scoring…" : "Filing your debrief in the binder…"}
        </p>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label="CPO drill stage"
      style={drillShellStyle}
    >
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={titleStyle}>Drill</span>
          <span style={subTitleStyle}>
            {loadState.data.company} · {loadState.data.round}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DrillTimer elapsedMs={elapsedMs} targetSeconds={timerSeconds} />
          {onExit && (
            <button type="button" onClick={onExit} style={ghostButtonStyle}>
              Exit drill
            </button>
          )}
        </div>
      </header>

      {currentQuestion && (
        <DrillQuestionCard
          index={currentIndex}
          total={questions.length}
          text={currentQuestion.text}
          category={currentQuestion.category}
        />
      )}

      {currentInterrupt && (
        <InterruptBubble
          type={currentInterrupt.type}
          prompt={currentInterrupt.prompt}
          onDismiss={handleDismissInterrupt}
        />
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: 9,
            color: "#7EC8E3",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Your answer
        </span>
        <textarea
          aria-label="Your answer"
          value={text}
          onChange={(e) => handleTextChange(e.currentTarget.value)}
          placeholder="Walk me through it. Start with the situation…"
          rows={6}
          style={textareaStyle}
        />
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleDoneAnswer}
          disabled={submitting || !text.trim()}
          style={
            submitting || !text.trim()
              ? { ...primaryButtonStyle, opacity: 0.5, cursor: "not-allowed" }
              : primaryButtonStyle
          }
          aria-label="Done with answer"
        >
          {submitting ? "Scoring…" : "Done with answer →"}
        </button>
        {currentQuestion && (
          <DrillVoiceMic
            voiceEnabled={voiceEnabled}
            voicePermDisabled={voicePermDisabled}
            drillId={loadState.data.drillId}
            questionId={currentQuestion.id}
            onTranscribed={handleTranscribed}
            onError={(m) => setVoiceError(m)}
          />
        )}
        {voiceError && (
          <span
            role="status"
            style={{
              fontSize: 10,
              color: "#DC3C3C",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Voice: {voiceError}
          </span>
        )}
        {scoreError && (
          <span
            role="status"
            style={{
              fontSize: 10,
              color: "#DC3C3C",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Score: {scoreError}
          </span>
        )}
      </div>

      <LiveSTARBoard hints={hints} />

      {/* STAR_WEIGHTS kept for potential local preview — referenced to prevent
          tree-shaking in case future UI surfaces it. */}
      <span aria-hidden style={{ display: "none" }}>
        {STAR_WEIGHTS.a}
      </span>
    </section>
  );
}

// ── Styles (local) ───────────────────────────────────────────────────
const drillShellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 16,
  height: "100%",
  minHeight: 0,
  overflow: "auto",
  background: "linear-gradient(180deg, rgba(13,21,36,0.7), rgba(6,10,18,0.7))",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const titleStyle: CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 18,
  color: "#E8F4FD",
  letterSpacing: "0.02em",
};

const subTitleStyle: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  color: "#7EC8E3",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const loaderLabelStyle: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: "#7EC8E3",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: 0,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 120,
  padding: 12,
  border: "1px solid #1A2E4A",
  borderRadius: 2,
  background: "#060A12",
  color: "#E8F4FD",
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
  fontSize: 13,
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  padding: "8px 16px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#4A9EDB",
  background: "rgba(74,158,219,0.1)",
  border: "1px solid rgba(74,158,219,0.35)",
  borderRadius: 2,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const ghostButtonStyle: CSSProperties = {
  padding: "6px 12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#4A6A85",
  background: "transparent",
  border: "1px solid rgba(74,106,133,0.35)",
  borderRadius: 2,
  cursor: "pointer",
};
