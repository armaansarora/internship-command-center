"use client";

import type { JSX } from "react";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OtisCharacter, type OtisMood } from "@/components/lobby/concierge/OtisCharacter";
import { OtisDialoguePanel, type OtisMessage, type OtisStatus } from "@/components/lobby/concierge/OtisDialoguePanel";
import { CinematicArrival } from "@/components/lobby/cinematic/CinematicArrival";
import { BuildingDirectory } from "@/components/lobby/directory/BuildingDirectory";
import { useConciergeChat } from "@/hooks/useConciergeChat";
import { claimArrivalPlayAction } from "./actions";

/**
 * ConciergeFlow — the R4 onboarding orchestrator.
 *
 * Runs only for authenticated users whose onboarding is incomplete
 * (server decides based on concierge_completed_at / arrival_played_at).
 * Owns the sequence:
 *
 *   1. Atomic claim on arrival_played_at → decides cinematic plays.
 *   2. CinematicArrival (if won) → onComplete → phase "concierge".
 *   3. Otis conversation via useConciergeChat → user confirms or skips.
 *   4. POST /api/concierge/extract with the transcript.
 *   5. POST /api/onboarding/bootstrap-discovery (race with cinematic).
 *   6. Router.push("/penthouse").
 *
 * The Building Directory renders as a quiet side panel from step 2
 * onward — the floor the user will unlock first is the Penthouse once
 * the first briefing lands.
 */

interface ConciergeFlowProps {
  arrivalAlreadyPlayed: boolean;
  floorsUnlocked: string[];
  guestName: string;
}

type Phase = "claiming" | "cinematic" | "concierge" | "finishing" | "redirecting";

export function ConciergeFlow({
  arrivalAlreadyPlayed,
  floorsUnlocked,
  guestName,
}: ConciergeFlowProps): JSX.Element {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(arrivalAlreadyPlayed ? "concierge" : "claiming");
  const [cinematicShouldPlay, setCinematicShouldPlay] = useState(false);
  const bootstrapFiredRef = useRef(false);

  // Local time context passed to /api/concierge/chat so Otis's greeting
  // register is correct regardless of the server's UTC clock.
  const localContext = useMemo(() => {
    if (typeof window === "undefined") {
      return { timezone: "UTC", localHour: 9 };
    }
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return { timezone: tz, localHour: new Date().getHours() };
  }, []);

  const { messages, input, setInput, submit, status, sendRaw } =
    useConciergeChat({
      body: localContext,
    });

  // Phase 1 — atomic claim for the cinematic.
  useEffect(() => {
    if (phase !== "claiming") return;
    let cancelled = false;
    claimArrivalPlayAction().then((result) => {
      if (cancelled) return;
      if (result.shouldPlayCinematic) {
        setCinematicShouldPlay(true);
        setPhase("cinematic");
      } else {
        setPhase("concierge");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Otis seeds the conversation with a greeting once the user reaches the
  // concierge phase — the first beat is his, not the user's.
  useEffect(() => {
    if (phase !== "concierge") return;
    if (messages.length > 0) return;
    sendRaw("__SYSTEM_KICKOFF__"); // Otis sees this and opens normally.
  }, [phase, messages.length, sendRaw]);

  const otisMessages: OtisMessage[] = useMemo(
    () =>
      messages
        .filter((m) => !isSystemKickoff(m))
        .map((m) => ({
          id: m.id,
          role: m.role === "assistant" ? "assistant" : "user",
          text: extractText(m),
        })),
    [messages],
  );

  const otisStatus: OtisStatus =
    status === "streaming"
      ? "streaming"
      : status === "submitted"
        ? "thinking"
        : "idle";

  const otisMood: OtisMood =
    phase === "cinematic" || phase === "claiming"
      ? "idle"
      : status === "streaming"
        ? "talking"
        : status === "submitted"
          ? "thinking"
          : otisMessages.length === 0
            ? "greeting"
            : "listening";

  // Once the conversation settles (user sent 2+ messages + Otis replied),
  // show a Confirm button. For simplicity we let the user confirm explicitly.
  const conversationReady = otisMessages.filter((m) => m.role === "user").length >= 2;

  const handleConfirm = useCallback(async () => {
    if (phase === "finishing" || phase === "redirecting") return;
    setPhase("finishing");
    const turns = otisMessages.map((m) => ({ role: m.role, text: m.text }));
    try {
      await fetch("/api/concierge/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turns, skip: false }),
      });
    } catch {
      // Still proceed — the skip-placeholder path will catch missing profiles.
    }
    await fireBootstrapOnce(bootstrapFiredRef);
    setPhase("redirecting");
    router.push("/penthouse");
  }, [otisMessages, phase, router]);

  const handleSkip = useCallback(async () => {
    if (phase === "finishing" || phase === "redirecting") return;
    setPhase("finishing");
    try {
      await fetch("/api/concierge/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turns: [], skip: true }),
      });
    } catch {
      // Still proceed.
    }
    await fireBootstrapOnce(bootstrapFiredRef);
    setPhase("redirecting");
    router.push("/penthouse");
  }, [phase, router]);

  return (
    <div
      aria-label="Lobby onboarding"
      data-phase={phase}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        backgroundColor: "rgba(12, 6, 7, 0.78)",
      }}
    >
      {/* Cinematic arrival — owns the stage when phase === "cinematic" */}
      {phase === "cinematic" && (
        <CinematicArrival
          arrivalAlreadyPlayed={!cinematicShouldPlay}
          onComplete={() => setPhase("concierge")}
          onSkip={() => setPhase("concierge")}
        />
      )}

      {/* Otis + Building Directory side-by-side when the Concierge is on-stage */}
      {(phase === "concierge" || phase === "finishing") && (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "32px",
              padding: "40px",
            }}
          >
            <OtisCharacter mood={otisMood} />
            <div style={{ width: "min(560px, 90%)", height: "min(420px, 60vh)" }}>
              <OtisDialoguePanel
                messages={otisMessages}
                status={otisStatus}
                input={input}
                onInputChange={setInput}
                onSubmit={submit}
                onSkip={handleSkip}
                canSkip
                opener={
                  otisMessages.length === 0
                    ? guestName
                      ? `Good to see you, ${guestName}.`
                      : "Good to see you."
                    : undefined
                }
              />
            </div>
            {conversationReady && phase === "concierge" && (
              <button
                type="button"
                onClick={handleConfirm}
                aria-label="Confirm with Otis and head upstairs"
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  backgroundColor: "#6B2A2E",
                  color: "#F5EEE1",
                  border: "1px solid #6B2A2E",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Send me up ☞
              </button>
            )}
          </div>
          <aside
            style={{
              padding: "32px 24px",
              borderLeft: "1px solid rgba(201, 168, 76, 0.16)",
              backgroundColor: "rgba(12, 6, 7, 0.6)",
              overflowY: "auto",
            }}
          >
            <BuildingDirectory floorsUnlocked={floorsUnlocked} />
          </aside>
        </>
      )}

      {phase === "redirecting" && (
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F5EEE1",
            fontFamily: "'Playfair Display', serif",
            fontSize: "18px",
          }}
        >
          Taking you up…
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText(m: UIMessage): string {
  const parts = Array.isArray(m.parts) ? m.parts : [];
  return parts
    .filter(
      (p: unknown): p is { type: "text"; text: string } =>
        (p as { type?: string } | null)?.type === "text",
    )
    .map((p: { text: string }) => p.text)
    .join("");
}

function isSystemKickoff(m: UIMessage): boolean {
  if (m.role !== "user") return false;
  return extractText(m).trim() === "__SYSTEM_KICKOFF__";
}

async function fireBootstrapOnce(ref: { current: boolean }): Promise<void> {
  if (ref.current) return;
  ref.current = true;
  try {
    await fetch("/api/onboarding/bootstrap-discovery", { method: "POST" });
  } catch {
    // Swallow — the cron will pick it up within 4h if the bootstrap missed.
  }
}
