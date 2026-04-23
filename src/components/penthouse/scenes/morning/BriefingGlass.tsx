"use client";
import type { JSX } from "react";
import { GlassPanel } from "@/components/penthouse/GlassPanel";
import { BriefingBeat } from "./BriefingBeat";
import type { MorningBriefing } from "@/lib/ai/agents/morning-briefing";

/**
 * BriefingGlass — the unfolding pane where the CEO's morning briefing appears.
 *
 * Visually: a larger glass panel with a thin gold top-border, a small header
 * (`MORNING BRIEFING · [DATE]`), and a vertical stack of beats revealed by
 * the parent via `currentIndex`. Past beats stay visible (muted slightly)
 * so the user can re-read the full script.
 */
interface Props {
  briefing: MorningBriefing;
  /** Highest-revealed beat index. Beats with `i ≤ currentIndex` are shown. */
  currentIndex: number;
  /** Optional date string for the header; defaults to today's "Monday, April 22". */
  dateLabel?: string;
}

export function BriefingGlass({ briefing, currentIndex, dateLabel }: Props): JSX.Element {
  const date =
    dateLabel ??
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  return (
    <GlassPanel className="p-7 md:p-9 flex flex-col gap-2" delay={200}>
      {/* Header — NOT a "Welcome back!" banner. A quiet chyron. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--gold)",
            boxShadow: "0 0 8px rgba(201, 168, 76, 0.7)",
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--gold)",
            opacity: 0.7,
          }}
        >
          Morning Briefing · {date}
        </span>
      </div>

      <div
        role="list"
        aria-label="Morning briefing beats"
        style={{ display: "flex", flexDirection: "column", gap: "4px" }}
      >
        {briefing.beats.map((beat, i) => (
          <div role="listitem" key={`${i}-${beat.text}`}>
            <BriefingBeat beat={beat} revealed={i <= currentIndex} delayMs={i === 0 ? 0 : 180} />
          </div>
        ))}
      </div>

      {/* Thin gold bottom rule — sense of pane-ness */}
      <div
        aria-hidden="true"
        style={{
          height: "1px",
          width: "56px",
          background:
            "linear-gradient(to right, rgba(201, 168, 76, 0.5), rgba(201, 168, 76, 0))",
          marginTop: "18px",
        }}
      />
    </GlassPanel>
  );
}
