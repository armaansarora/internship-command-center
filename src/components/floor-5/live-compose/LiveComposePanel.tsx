"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PenGlowCursor } from "./PenGlowCursor";

/**
 * R5.4 — LiveComposePanel.
 *
 * Three-tone live-compose surface. On mount (or when `start` becomes true)
 * fires three parallel POSTs to /api/writing-room/compose-stream (one per
 * tone), accumulates token deltas into per-tone state, and renders each
 * card with a pen-glow cursor at the live edge.
 *
 * prefers-reduced-motion: streaming text continues to flow; PenGlowCursor
 * is not rendered. Detected via `window.matchMedia` on mount (fallback:
 * false when not in browser / SSR).
 *
 * Intent anchor: "you watch a cover letter compose itself in real time,
 * as if the character is writing it." (R5 Brief verbatim.)
 */

export type ToneKey = "formal" | "conversational" | "bold";

export interface LiveComposePanelProps {
  companyName: string;
  role: string;
  jobDescription?: string;
  companyResearch?: string;
  /** If true, fires immediately on mount. Defaults to true. */
  autoStart?: boolean;
  /** Override for tests / reduced-motion SSR assertion. */
  reducedMotion?: boolean;
  /** Called once all three streams resolve with their final text. */
  onComplete?: (texts: Record<ToneKey, string>) => void;
  /** Called on any per-tone failure — does not cancel other tones. */
  onToneError?: (tone: ToneKey, err: Error) => void;
  /** Override endpoint URL, mainly for tests. */
  endpoint?: string;
}

const TONES: ToneKey[] = ["formal", "conversational", "bold"];

const TONE_LABEL: Record<ToneKey, string> = {
  formal: "Formal",
  conversational: "Conversational",
  bold: "Bold",
};

const TONE_ANCHOR: Record<ToneKey, string> = {
  formal: "#C9A84C",
  conversational: "#7BC47B",
  bold: "#DC643C",
};

function useReducedMotion(override?: boolean): boolean {
  const [reduced, setReduced] = useState<boolean>(override ?? false);
  useEffect(() => {
    if (override !== undefined) return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [override]);
  return reduced;
}

export function LiveComposePanel({
  companyName,
  role,
  jobDescription,
  companyResearch,
  autoStart = true,
  reducedMotion,
  onComplete,
  onToneError,
  endpoint = "/api/writing-room/compose-stream",
}: LiveComposePanelProps): JSX.Element {
  const reduced = useReducedMotion(reducedMotion);
  const [texts, setTexts] = useState<Record<ToneKey, string>>({
    formal: "",
    conversational: "",
    bold: "",
  });
  const [penTick, setPenTick] = useState<Record<ToneKey, number>>({
    formal: 0,
    conversational: 0,
    bold: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<ToneKey, string>>>({});
  const [done, setDone] = useState<Record<ToneKey, boolean>>({
    formal: false,
    conversational: false,
    bold: false,
  });
  const startedRef = useRef(false);

  const streamOne = useCallback(
    async (tone: ToneKey): Promise<void> => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tone,
            companyName,
            role,
            jobDescription,
            companyResearch,
          }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { value, done: rDone } = await reader.read();
          if (rDone) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            setTexts((prev) => ({ ...prev, [tone]: prev[tone] + chunk }));
            setPenTick((prev) => ({ ...prev, [tone]: prev[tone] + 1 }));
          }
        }
        setDone((prev) => ({ ...prev, [tone]: true }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setErrors((prev) => ({ ...prev, [tone]: message }));
        setDone((prev) => ({ ...prev, [tone]: true }));
        onToneError?.(tone, err instanceof Error ? err : new Error(message));
      }
    },
    [endpoint, companyName, role, jobDescription, companyResearch, onToneError],
  );

  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;
    void Promise.all(TONES.map((t) => streamOne(t)));
  }, [autoStart, streamOne]);

  useEffect(() => {
    if (!onComplete) return;
    if (TONES.every((t) => done[t])) {
      onComplete({ ...texts });
    }
  }, [done, texts, onComplete]);

  const penActive = useMemo(
    () => ({
      formal: penTick.formal > 0 && !done.formal,
      conversational: penTick.conversational > 0 && !done.conversational,
      bold: penTick.bold > 0 && !done.bold,
    }),
    [penTick, done],
  );

  return (
    <section
      role="region"
      aria-label="Live compose — cover letter streaming"
      className="live-compose-panel"
      style={{
        backgroundColor: "#1A1008",
        border: "1px solid #3A2510",
        borderRadius: "4px",
        padding: "20px",
        color: "#F5E6C8",
        fontFamily: "'Satoshi', system-ui, sans-serif",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "12px",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "18px",
            margin: 0,
            color: "#F5E6C8",
          }}
        >
          Composing…
        </h3>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "#7A5C3A",
          }}
        >
          R5.4 · LIVE COMPOSE
        </span>
      </div>

      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px",
        }}
      >
        {TONES.map((tone) => (
          <article
            key={tone}
            data-tone={tone}
            aria-live="polite"
            aria-busy={!done[tone]}
            style={{
              padding: "14px",
              backgroundColor: "rgba(0,0,0,0.25)",
              border: `1px solid ${TONE_ANCHOR[tone]}`,
              borderRadius: "3px",
              minHeight: "160px",
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.12em",
                color: TONE_ANCHOR[tone],
                marginBottom: "8px",
              }}
            >
              {TONE_LABEL[tone].toUpperCase()}
              {errors[tone] ? (
                <span style={{ marginLeft: 8, color: "#DC643C" }}>· error</span>
              ) : done[tone] ? (
                <span style={{ marginLeft: 8, color: "#7BC47B" }}>· done</span>
              ) : null}
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "13px",
                lineHeight: 1.55,
                color: "#F5E6C8",
                whiteSpace: "pre-wrap",
              }}
            >
              {texts[tone]}
              {!reduced && !done[tone] ? <PenGlowCursor active={penActive[tone]} /> : null}
            </div>
            {errors[tone] ? (
              <div
                role="alert"
                style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  color: "#DC643C",
                }}
              >
                {errors[tone]}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <p
        style={{
          marginTop: "14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.1em",
          color: "#3A2510",
          textAlign: "right",
        }}
      >
        LIVE COMPOSE · R5.4
      </p>
    </section>
  );
}
