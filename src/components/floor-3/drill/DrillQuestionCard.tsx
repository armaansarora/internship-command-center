"use client";

import type { JSX } from "react";

/**
 * DrillQuestionCard.
 *
 * Shows the active question with a small category chip + Q-number badge
 * ("Q2 / 3 — behavioral"). Intentionally minimal: no state, no timing,
 * just the question on a dark glass card.
 */

interface Props {
  index: number;
  total: number;
  text: string;
  category: "behavioral" | "technical" | "culture-fit" | "case";
}

export function DrillQuestionCard({
  index,
  total,
  text,
  category,
}: Props): JSX.Element {
  return (
    <article
      aria-label={`Drill question ${index + 1} of ${total}`}
      style={{
        padding: 16,
        border: "1px solid #1A2E4A",
        borderRadius: 3,
        background: "linear-gradient(180deg, rgba(13,21,36,0.9), rgba(6,10,18,0.9))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: "#7EC8E3",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Q{index + 1} / {total} — {category}
        </span>
      </div>
      <h2
        style={{
          fontSize: 16,
          color: "#E8F4FD",
          lineHeight: 1.4,
          margin: 0,
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        {text}
      </h2>
    </article>
  );
}
