"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { pickCeoVoice, buildCeoUtterance } from "@/lib/voice/ceo-voice";

/**
 * CEOVoicePlayButton.
 *
 * Opt-in "Read aloud" button for the negotiation draft in the Parlor. The
 * button is gated by a three-layer pattern, identical to R6 voice:
 *
 *   Layer 1 — Settings toggle (`ceoVoice.enabled`). The caller passes the
 *   current value as `enabled`. Default OFF.
 *
 *   Layer 2 — Per-surface enable check. Each place that wants voice (today:
 *   NegotiationDraftPanel) checks the pref and passes it down as `enabled`.
 *
 *   Layer 3 — Graceful browser fallback. When `window.speechSynthesis` or
 *   `SpeechSynthesisUtterance` is missing (SSR, old browser, restricted
 *   iframe, etc.), the button renders `null`.
 *
 * All three gates must be GREEN for the button to render. The
 * ceo-voice-three-layer PROOF test keeps future refactors honest.
 *
 * NO cloud TTS — `window.speechSynthesis` ONLY. ElevenLabs / OpenAI /
 * Cartesia / Deepgram are all drift per partner constraints. Browser
 * synthesis keeps the feature free, private, and gracefully degradable.
 *
 * The button toggles play/stop. While speaking, aria-pressed=true and the
 * label switches to "Stop reading". On unmount mid-speech, we call
 * `speechSynthesis.cancel()` to avoid zombie audio bleeding into the next
 * page.
 */
interface Props {
  /** Layer 1/2 — `ceoVoice.enabled` from the settings pref. */
  enabled: boolean;
  /** The text to speak. Usually the negotiation draft body. */
  text: string;
}

/**
 * Layer 3 snapshot — browser speech support. `useSyncExternalStore` is the
 * React-blessed primitive for reading non-React, non-changing environment
 * state in a way that stays hydration-safe: the server snapshot is `false`
 * (so the SSR pass renders no button), and the client snapshot is computed
 * once after mount to pick up real browser capabilities.
 *
 * We don't need a subscription because support doesn't change at runtime;
 * the subscribe callback is a no-op.
 */
function getSupportSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as {
    speechSynthesis?: SpeechSynthesis;
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  };
  return Boolean(win.speechSynthesis && win.SpeechSynthesisUtterance);
}

function subscribeSupport(_cb: () => void): () => void {
  return () => undefined;
}

function getSupportServerSnapshot(): boolean {
  return false;
}

export function CEOVoicePlayButton({ enabled, text }: Props): JSX.Element | null {
  // Layer 3 — Browser support.
  const supported = useSyncExternalStore(
    subscribeSupport,
    getSupportSnapshot,
    getSupportServerSnapshot,
  );

  const [playing, setPlaying] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Voice picking — runs after mount, re-runs when `enabled` flips (no
  // point picking a voice while gated off). `voiceschanged` is fired
  // async by some browsers (notably Chrome) once the voices list is
  // populated; we re-pick in response.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const win = window as unknown as {
      speechSynthesis?: SpeechSynthesis;
      SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    };
    if (!win.speechSynthesis || !win.SpeechSynthesisUtterance) return;

    const updateVoice = (): void => {
      voiceRef.current = pickCeoVoice(win.speechSynthesis!.getVoices());
    };
    updateVoice();
    win.speechSynthesis.addEventListener?.("voiceschanged", updateVoice);
    return () => {
      win.speechSynthesis?.removeEventListener?.("voiceschanged", updateVoice);
    };
  }, [enabled]);

  // Cancel any in-flight speech on unmount — no zombie audio after nav.
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      const win = window as unknown as { speechSynthesis?: SpeechSynthesis };
      win.speechSynthesis?.cancel?.();
    };
  }, []);

  const toggle = useCallback((): void => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { speechSynthesis?: SpeechSynthesis };
    const synth = win.speechSynthesis;
    if (!synth) return;

    if (playing) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    const u = buildCeoUtterance(text, voiceRef.current);
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    synth.speak(u);
    setPlaying(true);
  }, [playing, text]);

  // Gate combination: all three layers must be green. Layer 1/2 is
  // `enabled`; Layer 3 is `supported`.
  if (!enabled || !supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="ceo-voice-play"
      aria-pressed={playing}
      aria-label={playing ? "Stop reading" : "Read draft aloud"}
    >
      {playing ? "◼ Stop" : "▶ Read aloud"}
    </button>
  );
}
