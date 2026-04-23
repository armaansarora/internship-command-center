"use client";
import { type JSX } from "react";
import { GlassPanel } from "@/components/penthouse/GlassPanel";
import { CEOAtWindow } from "@/components/penthouse/ceo-at-window/CEOAtWindow";

/**
 * Evening scene — the CEO reflects on the day rather than staging a new one.
 * Muted lighting (achieved by a lower-opacity glass + warmer copy). No new
 * beats to reveal; one quiet line + the choice to continue.
 */
interface Props {
  displayName: string;
  todayTouched?: number;
  onDismiss?: () => void;
}

export function EveningScene({ displayName, todayTouched, onDismiss }: Props): JSX.Element {
  const touched = typeof todayTouched === "number" ? todayTouched : null;
  const line =
    touched === null
      ? "The building winds down. You've still got time to set up tomorrow."
      : touched === 0
        ? "Quiet day on the board. That's alright — closing up well sets tomorrow up better."
        : `${touched} ${touched === 1 ? "thing" : "things"} moved today. Pick one to close before you leave the floor.`;

  return (
    <section
      aria-label="Evening wind-down"
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
          maxWidth: "960px",
          display: "grid",
          gridTemplateColumns: "minmax(220px, 320px) 1fr",
          columnGap: "48px",
          alignItems: "center",
        }}
      >
        <CEOAtWindow prefaced enterDelayMs={0} />
        <GlassPanel
          className="p-7 md:p-9 flex flex-col gap-3"
          delay={150}
          accentColor="rgba(230, 195, 112, 0.4)"
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "#E6C370",
              opacity: 0.7,
              marginBottom: "6px",
            }}
          >
            Wind-down
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
              color: "#E6C370",
              background: "transparent",
              border: "1px solid rgba(230, 195, 112, 0.35)",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(230, 195, 112, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Wind down
          </button>
        </GlassPanel>
      </div>
    </section>
  );
}
