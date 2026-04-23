"use client";

import { useEffect, useState, type JSX } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { BriefingBeat as BriefingBeatType } from "@/lib/ai/agents/morning-briefing";

/**
 * One beat of the Morning Briefing — revealed character-by-character once
 * `revealed` flips to true. Respects `prefers-reduced-motion`: instant text,
 * no typewriter.
 */
interface Props {
  beat: BriefingBeatType;
  revealed: boolean;
  /** Start-of-reveal delay; used to stagger consecutive beats. */
  delayMs?: number;
  /** ms per character; default 25. */
  charMs?: number;
}

const TONE_COLOR: Record<BriefingBeatType["tone"], string> = {
  steady: "var(--text-primary)",
  warm: "#E6C370",
  urgent: "#E89B4B",
  reflective: "var(--text-secondary)",
  warning: "#D46A5B",
};

const TONE_GLOW: Record<BriefingBeatType["tone"], string> = {
  steady: "rgba(201, 168, 76, 0.0)",
  warm: "rgba(230, 195, 112, 0.35)",
  urgent: "rgba(232, 155, 75, 0.45)",
  reflective: "rgba(255, 255, 255, 0.0)",
  warning: "rgba(212, 106, 91, 0.4)",
};

export function BriefingBeat({ beat, revealed, delayMs = 0, charMs = 25 }: Props): JSX.Element {
  const reduced = useReducedMotion();
  const [chars, setChars] = useState<number>(0);

  useEffect(() => {
    if (!revealed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChars(0);
      return;
    }
    if (reduced) {
      setChars(beat.text.length);
      return;
    }
    const timeouts: number[] = [];
    const startTimer = window.setTimeout(() => {
      let i = 0;
      const step = () => {
        i += 1;
        setChars(i);
        if (i < beat.text.length) {
          timeouts.push(window.setTimeout(step, charMs));
        }
      };
      timeouts.push(window.setTimeout(step, charMs));
    }, delayMs);
    return () => {
      window.clearTimeout(startTimer);
      for (const t of timeouts) window.clearTimeout(t);
    };
  }, [beat.text, revealed, delayMs, charMs, reduced]);

  const visible = chars > 0 && revealed;
  const text = beat.text.slice(0, chars);

  return (
    <p
      aria-live={revealed ? "polite" : "off"}
      style={{
        margin: 0,
        padding: "6px 0",
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: "clamp(17px, 1.7vw, 22px)",
        lineHeight: 1.45,
        color: TONE_COLOR[beat.tone],
        textShadow: visible ? `0 0 18px ${TONE_GLOW[beat.tone]}` : "none",
        opacity: visible ? 1 : 0,
        minHeight: "1.5em",
        transition: "opacity 0.3s ease-out",
        // Preserve layout space so the glass doesn't shift as beats reveal.
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
      {visible && chars < beat.text.length && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "2px",
            height: "1em",
            marginLeft: "3px",
            background: TONE_COLOR[beat.tone],
            verticalAlign: "text-bottom",
            animation: "briefing-caret 0.9s steps(2, start) infinite",
          }}
        />
      )}
    </p>
  );
}
