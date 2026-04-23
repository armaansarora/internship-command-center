"use client";
import { useState, type JSX } from "react";
import { GlassPanel } from "@/components/penthouse/GlassPanel";

/**
 * Late-night scene — CEO has gone home. No character on-screen. A dim desk
 * lamp in the corner, a small glass prompt inviting the user to jot something
 * down. Matches the brief's rule that the Penthouse must stay meaningful
 * outside the morning hour — here the meaning is intentional solitude.
 */
interface Props {
  onDismiss?: () => void;
}

export function LateNightScene({ onDismiss }: Props): JSX.Element {
  const [note, setNote] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  return (
    <section
      aria-label="Night shift"
      className="relative w-full"
      style={{
        minHeight: "calc(100dvh - 120px)",
        padding: "48px 24px",
        display: "grid",
        placeItems: "center",
      }}
    >
      {/* Dim desk lamp — a simple radial glow bottom-left */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "60px",
          left: "10%",
          width: "240px",
          height: "180px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(201, 168, 76, 0.18) 0%, rgba(201, 168, 76, 0.05) 50%, transparent 80%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      <GlassPanel
        className="p-7 md:p-8 flex flex-col gap-3"
        delay={100}
        accentColor="rgba(201, 168, 76, 0.25)"
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(201, 168, 76, 0.6)",
            marginBottom: "4px",
          }}
        >
          Night shift
        </div>
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(17px, 1.6vw, 21px)",
            lineHeight: 1.5,
            color: "rgba(245, 232, 192, 0.86)",
            margin: 0,
          }}
        >
          The CEO&apos;s gone home. The desk is still here — jot something down so
          morning has a starting point.
        </p>
        {submitted ? (
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "rgba(201, 168, 76, 0.75)",
              marginTop: "8px",
            }}
          >
            Left on the desk for morning.
          </p>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A question for tomorrow, a lead you haven't chased, a person to reach out to…"
              aria-label="Note to leave on the desk"
              rows={3}
              style={{
                marginTop: "8px",
                padding: "10px 12px",
                background: "rgba(14, 16, 32, 0.9)",
                border: "1px solid rgba(201, 168, 76, 0.15)",
                borderRadius: "4px",
                color: "var(--text-primary)",
                fontFamily: "'Satoshi', system-ui, sans-serif",
                fontSize: "14px",
                lineHeight: 1.5,
                resize: "vertical",
                width: "100%",
                maxWidth: "560px",
              }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              <button
                type="button"
                disabled={note.trim().length === 0}
                onClick={() => setSubmitted(true)}
                style={{
                  padding: "8px 14px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: note.trim().length === 0 ? "rgba(255,255,255,0.3)" : "var(--gold)",
                  background: "transparent",
                  border: "1px solid rgba(201,168,76,0.35)",
                  borderRadius: "3px",
                  cursor: note.trim().length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Leave for morning
              </button>
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  padding: "8px 14px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.45)",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                Just walk through
              </button>
            </div>
          </>
        )}
      </GlassPanel>
    </section>
  );
}
