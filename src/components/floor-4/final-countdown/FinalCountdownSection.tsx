"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { useRingPulse } from "../rings/useRingPulse";

export interface CountdownCard {
  id: string;
  companyName: string;
  role: string;
  deadlineAtMs: number;
}

interface FinalCountdownSectionProps {
  cards: CountdownCard[];
}

type Tier = "t_24h" | "t_72h" | "t_7d";

function tierFor(msRemaining: number): Tier {
  if (msRemaining < 24 * 60 * 60 * 1000) return "t_24h";
  if (msRemaining < 72 * 60 * 60 * 1000) return "t_72h";
  return "t_7d";
}

const TIER_COLOR: Record<Tier, string> = {
  t_24h: "#E84040",
  t_72h: "#DC7C28",
  t_7d: "#F0A050",
};
const TIER_LABEL: Record<Tier, string> = {
  t_24h: "TODAY",
  t_72h: "3 DAYS",
  t_7d: "THIS WEEK",
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return `${h}h ${m}m`;
}

export function FinalCountdownSection({ cards }: FinalCountdownSectionProps): JSX.Element | null {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const rings = useRingPulse();

  // Refresh countdown every 60s.
  useEffect(() => {
    if (cards.length === 0) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, [cards.length]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      rings.pulse(e.clientX, e.clientY);
    },
    [rings],
  );

  // Only show cards with a deadline in the future within 7 days.
  const visible = cards
    .filter((c) => {
      const delta = c.deadlineAtMs - nowMs;
      return delta > 0 && delta <= 7 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => a.deadlineAtMs - b.deadlineAtMs);

  if (visible.length === 0) return null;

  return (
    <section
      aria-label={`Final countdown — ${visible.length} application${visible.length > 1 ? "s" : ""} with deadlines in the next 7 days`}
      data-situation-section="final-countdown"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px 16px",
        background: "rgba(220, 124, 40, 0.04)",
        border: "1px solid rgba(220, 124, 40, 0.2)",
        borderRadius: 4,
        marginBottom: 18,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#DC7C28",
          fontWeight: 700,
        }}
      >
        Final Countdown · {visible.length}
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {visible.map((c) => {
          const remaining = c.deadlineAtMs - nowMs;
          const tier = tierFor(remaining);
          const accent = TIER_COLOR[tier];
          return (
            <article
              key={c.id}
              tabIndex={0}
              role="button"
              onClick={handleClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  rings.pulse(rect.left + rect.width / 2, rect.top + rect.height / 2);
                }
              }}
              aria-label={`${c.companyName} ${c.role} — deadline in ${formatRemaining(remaining)}`}
              data-tier={tier}
              style={{
                padding: 12,
                background: `${accent}0C`,
                border: `1px solid ${accent}40`,
                borderRadius: 4,
                fontFamily: "IBM Plex Mono, monospace",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: accent,
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                  }}
                >
                  {TIER_LABEL[tier]}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: accent,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                  }}
                >
                  {formatRemaining(remaining)}
                </span>
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: "#FDF3E8",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.companyName}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#C4925A",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.role}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
