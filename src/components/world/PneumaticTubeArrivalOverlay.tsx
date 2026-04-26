"use client";

/**
 * System-wide pneumatic-tube arrival overlay.
 *
 * Mounted once at the world-chrome level (inside PersistentWorld) so every
 * authenticated floor receives tube arrivals. This component REPLACES the
 * old bell-icon-dropdown notification pattern — in the Tower metaphor,
 * deliveries arrive via pneumatic tube, not a notification bell.
 *
 * Data source: `useTubeDeliveries` subscribes to the user's notifications
 * table via Supabase realtime and sweeps every 60s, claiming rows atomically
 * so only one tab/device plays the thunk per arrival.
 *
 * Visual vocabulary is shared with
 * `src/components/penthouse/quick-actions/PneumaticTubeOverlay.tsx` — two
 * beats (envelope arrives → card unfolds), same accent colour palette,
 * same "Walk there" affordance when the notification carries a target URL.
 *
 * Sound: `synthThunk` plays through the user's AudioContext when
 * `SoundProvider.enabled` is true. We don't try to steal sound focus —
 * users who haven't enabled sound just see the animation.
 *
 * Motion: respects `prefers-reduced-motion` — the result card appears
 * instantly and the thunk is muted (impact without animation would feel
 * jarring without the visual accompaniment).
 *
 * Queue: if multiple notifications arrive while one is on screen, they
 * stack into `queueRef` and display one at a time. First-in-first-out.
 */

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useTubeDeliveries, type TubeArrival } from "@/hooks/useTubeDeliveries";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSoundEngine } from "./SoundProvider";
import { synthThunk } from "@/lib/audio/synth-thunk";

type Phase = "idle" | "outgoing" | "returning" | "result";

const ACCENT = "#C9A84C";
const GLOW = "rgba(201, 168, 76, 0.28)";

/**
 * Singleton AudioContext lazily created on first thunk. Browsers gate
 * AudioContext creation behind a user gesture — the user enabling sound
 * in SoundProvider counts, so by the time `useSoundEngine().enabled` is
 * true we're past that gate.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function PneumaticTubeArrivalOverlay(): JSX.Element | null {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { enabled: soundEnabled } = useSoundEngine();

  const [current, setCurrent] = useState<TubeArrival | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  // FIFO queue of pending arrivals — mutated imperatively so new deliveries
  // never re-render the overlay unless it's idle.
  const queueRef = useRef<TubeArrival[]>([]);

  // Pin latest sound-enabled / reduced-motion so the imperative handler
  // below reads current values without re-binding.
  const soundRef = useRef(soundEnabled);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  const playThunk = useCallback(() => {
    if (!soundRef.current) return;
    if (reducedRef.current) return;
    const c = getCtx();
    if (!c) return;
    try {
      synthThunk(c);
    } catch {
      // Audio failures are non-fatal — visual arrival is the contract.
    }
  }, []);

  const handleArrival = useCallback((notif: TubeArrival) => {
    queueRef.current.push(notif);
    // We only advance when idle; the onDismiss effect will drain the queue
    // on its next tick.
    setCurrent((prev) => (prev ? prev : queueRef.current.shift() ?? null));
  }, []);

  useTubeDeliveries({ onArrival: handleArrival });

  // Phase lifecycle — driven by `current`. Mirrors the Penthouse overlay's
  // two-beat sequence (outgoing envelope → card).
  useEffect(() => {
    if (!current) {
      setPhase("idle");
      return;
    }
    if (reduced) {
      setPhase("result");
      playThunk();
      return;
    }
    setPhase("outgoing");
    const toReturning = window.setTimeout(() => setPhase("returning"), 300);
    const toResult = window.setTimeout(() => {
      setPhase("result");
      playThunk();
    }, 600);
    return () => {
      window.clearTimeout(toReturning);
      window.clearTimeout(toResult);
    };
  }, [current, reduced, playThunk]);

  // Esc dismisses the current arrival.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const dismiss = useCallback(() => {
    // Pop the next queued arrival (if any) before clearing — this avoids a
    // flash of idle between back-to-back deliveries.
    const next = queueRef.current.shift() ?? null;
    setCurrent(next);
  }, []);

  if (!current) return null;

  const primaryAction = current.actions?.[0] ?? null;

  return (
    <div
      role="status"
      aria-label={`Tube delivery from ${current.sourceAgent ?? "the Tower"}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: phase === "result" ? "auto" : "none",
      }}
    >
      {/* Backdrop */}
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

      {/* Envelope — outgoing/returning phases only */}
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
            border: `1.5px solid ${ACCENT}`,
            boxShadow: `0 0 18px ${GLOW}, inset 0 0 10px ${GLOW}`,
            transform:
              phase === "outgoing"
                ? "translate(calc(-50% + 180px), calc(-50% - 180px)) rotate(12deg)"
                : "translate(-50%, -50%) rotate(0deg)",
            opacity: phase === "outgoing" ? 0 : 1,
            transition:
              phase === "outgoing"
                ? "transform 0.3s cubic-bezier(0.4, 0, 0.9, 0.6), opacity 0.3s ease-in"
                : "transform 0.3s cubic-bezier(0.22, 0.8, 0.32, 1), opacity 0.3s ease-out",
          }}
        />
      )}

      {phase === "result" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tube-arrival-title"
          style={{
            position: "relative",
            minWidth: "280px",
            maxWidth: "440px",
            padding: "18px 20px",
            background: "rgba(14, 16, 32, 0.96)",
            border: `1px solid ${ACCENT}`,
            borderTop: `3px solid ${ACCENT}`,
            borderRadius: "6px",
            boxShadow: `0 18px 48px rgba(0,0,0,0.5), 0 0 0 1px ${GLOW}`,
            animation: reduced ? undefined : "tube-arrival-pop 0.4s ease-out",
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
              color: ACCENT,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: ACCENT,
                boxShadow: `0 0 8px ${ACCENT}`,
              }}
            />
            Tube delivery
            {current.sourceAgent ? ` · from ${current.sourceAgent}` : ""}
          </div>
          <p
            id="tube-arrival-title"
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "16px",
              lineHeight: 1.4,
              color: "var(--text-primary)",
              fontWeight: 600,
            }}
          >
            {current.title}
          </p>
          {current.body ? (
            <p
              style={{
                margin: "6px 0 0",
                fontFamily:
                  "'Satoshi', system-ui, -apple-system, sans-serif",
                fontSize: "13px",
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              {current.body}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            {primaryAction ? (
              <button
                type="button"
                onClick={() => {
                  router.push(primaryAction.url);
                  dismiss();
                }}
                style={{
                  padding: "8px 14px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: ACCENT,
                  background: "transparent",
                  border: `1px solid ${ACCENT}`,
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                {primaryAction.label || "Walk there"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
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
              {primaryAction ? "Not now" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tube-arrival-pop {
          0%   { opacity: 0; transform: scale(0.96) translateY(4px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}
