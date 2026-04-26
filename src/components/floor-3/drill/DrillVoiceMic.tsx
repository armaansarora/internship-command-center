"use client";

import type { JSX } from "react";
import { useRef, useState } from "react";

/**
 * DrillVoiceMic.
 *
 * Opt-in mic button. Only ever visible when the user's profile has
 * `voice_recording_enabled=true` AND `voice_recording_permanently_disabled=false`.
 * The button itself is defence-in-depth — the canonical gate is server-side
 * (R6.2's 403/410 on audio-upload + transcribe). A buggy render cannot bypass.
 *
 * Lifecycle:
 *   idle → recording → uploading → transcribing → idle
 * Each upload uses the recorded MediaRecorder blob (webm/opus preferred,
 * mp4 fallback for Safari); transcription returns plain text that the
 * parent wires back into the textarea via `onTranscribed`.
 */

export interface VoiceMicProps {
  voiceEnabled: boolean;
  voicePermDisabled: boolean;
  drillId: string;
  questionId: string;
  onTranscribed: (text: string, path: string) => void;
  onError?: (msg: string) => void;
}

export function shouldShowVoiceToggle(flags: {
  voiceEnabled: boolean;
  voicePermDisabled: boolean;
}): boolean {
  return flags.voiceEnabled && !flags.voicePermDisabled;
}

type MicState = "idle" | "recording" | "uploading" | "transcribing";

export function DrillVoiceMic(props: VoiceMicProps): JSX.Element | null {
  const {
    voiceEnabled,
    voicePermDisabled,
    drillId,
    questionId,
    onTranscribed,
    onError,
  } = props;
  const [state, setState] = useState<MicState>("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  if (!shouldShowVoiceToggle({ voiceEnabled, voicePermDisabled })) return null;

  async function start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e): void => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async (): Promise<void> => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        setState("uploading");
        try {
          const fd = new FormData();
          fd.append("audio", blob);
          const upRes = await fetch(
            `/api/briefing/audio-upload?drillId=${encodeURIComponent(
              drillId,
            )}&questionId=${encodeURIComponent(questionId)}`,
            { method: "POST", body: fd },
          );
          if (!upRes.ok) throw new Error(`upload ${upRes.status}`);
          const { path } = (await upRes.json()) as { path: string };
          setState("transcribing");
          const trRes = await fetch(`/api/briefing/transcribe`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ path }),
          });
          if (!trRes.ok) throw new Error(`transcribe ${trRes.status}`);
          const { text } = (await trRes.json()) as { text: string };
          onTranscribed(text, path);
        } catch (err) {
          onError?.((err as Error).message);
        } finally {
          setState("idle");
        }
      };
      rec.start();
      recRef.current = rec;
      setState("recording");
    } catch (err) {
      onError?.((err as Error).message);
      setState("idle");
    }
  }

  function stop(): void {
    recRef.current?.stop();
    recRef.current = null;
  }

  const busy = state !== "idle";
  const label =
    state === "recording"
      ? "Stop recording"
      : state === "uploading"
      ? "Uploading…"
      : state === "transcribing"
      ? "Transcribing…"
      : "Record answer";
  const color = state === "recording" ? "#DC3C3C" : "#4A9EDB";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={state === "recording"}
      onClick={state === "recording" ? stop : start}
      disabled={busy && state !== "recording"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        border: `1px solid ${color}`,
        background: `${color}14`,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderRadius: 2,
        cursor: busy && state !== "recording" ? "wait" : "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: state === "recording" ? `0 0 6px ${color}` : "none",
        }}
      />
      {label}
    </button>
  );
}
