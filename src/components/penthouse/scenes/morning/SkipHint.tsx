"use client";
import type { JSX } from "react";

/**
 * Small floating hint at the bottom of the Morning Briefing Scene telling the
 * user how to advance or dismiss. Muted until hover, so it's present without
 * shouting.
 */
interface Props {
  /** true when all beats are revealed — hint updates to say "Esc to continue". */
  done?: boolean;
}

export function SkipHint({ done = false }: Props): JSX.Element {
  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: "rgba(255, 255, 255, 0.35)",
        pointerEvents: "none",
        userSelect: "none",
        textAlign: "center",
        lineHeight: 1.8,
      }}
    >
      {done ? (
        <>
          <kbd style={kbdStyle}>Esc</kbd>
          <span style={{ margin: "0 8px" }}>continue</span>
        </>
      ) : (
        <>
          <kbd style={kbdStyle}>Space</kbd>
          <span style={{ margin: "0 8px" }}>advance</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <kbd style={{ ...kbdStyle, marginLeft: "8px" }}>Esc</kbd>
          <span style={{ margin: "0 8px" }}>skip</span>
        </>
      )}
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "10px",
  color: "rgba(201, 168, 76, 0.8)",
  border: "1px solid rgba(201, 168, 76, 0.25)",
  borderRadius: "3px",
  padding: "2px 6px",
  backgroundColor: "rgba(14, 16, 32, 0.6)",
  letterSpacing: "0.05em",
};
