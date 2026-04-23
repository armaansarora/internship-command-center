"use client";
import { type JSX } from "react";
import { GlassPanel } from "@/components/penthouse/GlassPanel";
import { CEOAtWindow } from "@/components/penthouse/ceo-at-window/CEOAtWindow";

/**
 * Afternoon scene — CEO already facing the room, glass panel shows the
 * half-day check-in. Not a new briefing — a mid-day frame.
 */
interface Props {
  displayName: string;
  /** Count of changes since the morning briefing was posted; null = unknown. */
  changesSinceMorning?: number | null;
  onDismiss?: () => void;
}

export function AfternoonScene({ displayName, changesSinceMorning, onDismiss }: Props): JSX.Element {
  const line =
    typeof changesSinceMorning === "number"
      ? changesSinceMorning === 0
        ? "Nothing's shifted since this morning. Good time to push on something that needs room."
        : `${changesSinceMorning} ${changesSinceMorning === 1 ? "change" : "changes"} since we last spoke. Want to run through them?`
      : "How's the day going?";

  return (
    <section
      aria-label="Afternoon check-in"
      className="relative w-full"
      style={{
        minHeight: "calc(100dvh - 120px)",
        padding: "48px 24px",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        className="w-full"
        style={{
          maxWidth: "1080px",
          display: "grid",
          gridTemplateColumns: "minmax(220px, 320px) 1fr",
          columnGap: "48px",
          alignItems: "center",
        }}
      >
        <CEOAtWindow prefaced enterDelayMs={0} />
        <GlassPanel className="p-7 md:p-9 flex flex-col gap-3" delay={150}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--gold)",
              opacity: 0.7,
              marginBottom: "6px",
            }}
          >
            Half-day check-in
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(18px, 1.7vw, 22px)",
              lineHeight: 1.5,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {displayName ? `${displayName}. ` : ""}
            {line}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              alignSelf: "flex-start",
              marginTop: "12px",
              padding: "8px 14px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gold)",
              background: "transparent",
              border: "1px solid rgba(201,168,76,0.35)",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,168,76,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Continue
          </button>
        </GlassPanel>
      </div>
    </section>
  );
}
