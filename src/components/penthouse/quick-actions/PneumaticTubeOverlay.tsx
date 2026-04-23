"use client";
import { useEffect, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { QuickActionDispatch } from "./actionHandlers";

/**
 * Pneumatic-tube dispatch overlay.
 *
 * Renders a two-beat animation that sits above the Quick Actions row:
 *   1. Outgoing envelope: slides up-and-right (400ms), fades out.
 *   2. Incoming envelope: slides back in from up-and-right (400ms later),
 *      opens into a small acknowledgment card with the CEO-referred line
 *      ("CIO is warming up on Floor 6 …") and a "Walk there" button that
 *      navigates to the owner floor.
 *
 * `prefers-reduced-motion`: no translation; the result card appears
 * instantly and stays until dismissed.
 *
 * Closing: user clicks "Walk there" (→ navigate), "Not now" (→ dismiss),
 * or Esc.
 */
interface Props {
  /** The dispatch in progress; null when the overlay is idle. */
  dispatch: QuickActionDispatch | null;
  onDismiss: () => void;
}

export function PneumaticTubeOverlay({ dispatch, onDismiss }: Props): JSX.Element | null {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"outgoing" | "returning" | "result" | "idle">("idle");

  useEffect(() => {
    // When dispatch clears, we return null and rendering stops — phase reset
    // happens implicitly on the next dispatch cycle, so no synchronous
    // setState is needed here.
    if (!dispatch) return;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("result");
      return;
    }
    setPhase("outgoing");
    const toReturning = window.setTimeout(() => setPhase("returning"), 400);
    const toResult = window.setTimeout(() => setPhase("result"), 800);
    return () => {
      window.clearTimeout(toReturning);
      window.clearTimeout(toResult);
    };
  }, [dispatch, reduced]);

  // Esc closes at any stage.
  useEffect(() => {
    if (!dispatch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, onDismiss]);

  if (!dispatch) return null;

  const accent = dispatch.accentColor;
  const glow = dispatch.glowColor;

  return (
    <div
      role="status"
      aria-label={`${dispatch.ownerAgent ?? "Dispatch"} in flight`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: phase === "result" ? "auto" : "none",
      }}
    >
      {/* Backdrop — only visible on result phase */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10, 12, 24, 0.38)",
          opacity: phase === "result" ? 1 : 0,
          transition: "opacity 0.3s ease-out",
        }}
      />

      {/* Envelope — only drawn on outgoing/returning phases */}
      {(phase === "outgoing" || phase === "returning") && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "48px",
            height: "32px",
            borderRadius: "3px",
            background: "rgba(14, 16, 32, 0.94)",
            border: `1.5px solid ${accent}`,
            boxShadow: `0 0 18px ${glow}, inset 0 0 10px ${glow}`,
            transform:
              phase === "outgoing"
                ? "translate(calc(-50% + 180px), calc(-50% - 180px)) rotate(12deg)"
                : "translate(-50%, -50%) rotate(0deg)",
            opacity: phase === "outgoing" ? 0 : 1,
            transition:
              phase === "outgoing"
                ? "transform 0.4s cubic-bezier(0.4, 0, 0.9, 0.6), opacity 0.4s ease-in"
                : "transform 0.45s cubic-bezier(0.22, 0.8, 0.32, 1), opacity 0.3s ease-out",
          }}
        />
      )}

      {/* Result card — shown on result phase */}
      {phase === "result" && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "relative",
            minWidth: "280px",
            maxWidth: "440px",
            padding: "18px 20px",
            background: "rgba(14, 16, 32, 0.96)",
            border: `1px solid ${accent}`,
            borderTop: `3px solid ${accent}`,
            borderRadius: "6px",
            boxShadow: `0 18px 48px rgba(0,0,0,0.5), 0 0 0 1px ${glow}`,
            animation: reduced ? undefined : "tube-result-pop 0.4s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
              }}
            />
            Tube delivery · from {dispatch.ownerAgent}
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "16px",
              lineHeight: 1.5,
              color: "var(--text-primary)",
            }}
          >
            {dispatch.ackText}
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => {
                router.push(dispatch.route);
                onDismiss();
              }}
              style={{
                padding: "8px 14px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: accent,
                background: "transparent",
                border: `1px solid ${accent}`,
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Walk there
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
                color: "rgba(255,255,255,0.55)",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tube-result-pop {
          0%   { opacity: 0; transform: scale(0.96) translateY(4px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}
