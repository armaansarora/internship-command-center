"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo } from "react";
import type { UIMessage, ChatStatus } from "ai";
import { isToolUIPart, getToolName } from "ai";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import { CSuiteScene } from "./CSuiteScene";
import { CEOCharacter } from "./ceo-character/CEOCharacter";
import { CEODialoguePanel } from "./ceo-character/CEODialoguePanel";
import { CEOWhiteboard } from "./ceo-character/CEOWhiteboard";
import { RingTheBell } from "./RingTheBell";

interface CSuiteClientProps {
  stats: PipelineStats;
}

/**
 * Watch the CEO chat's UIMessage stream for `tool-dispatchTo<X>` parts and
 * return a map of toolName → "running" | "completed". Used by RingTheBell to
 * drive its subagent progress cards from real orchestrator activity.
 *
 * State semantics (per AI SDK v6):
 *   - `input-streaming` / `input-available` → subagent is being dispatched
 *     but hasn't returned yet.
 *   - `output-available` → subagent finished; result is in the tool part.
 *   - `output-error` → subagent errored.
 */
function extractDispatchEvents(messages: UIMessage[]): Record<string, "running" | "completed"> {
  const events: Record<string, "running" | "completed"> = {};
  for (const msg of messages) {
    if (msg.role !== "assistant" || !Array.isArray(msg.parts)) continue;
    for (const part of msg.parts) {
      if (!isToolUIPart(part)) continue;
      const name = getToolName(part);
      if (!name.startsWith("dispatchTo")) continue;
      // Once we've seen a completion for a tool, don't downgrade it if the
      // model later re-invokes the same tool (later turns).
      if (events[name] === "completed") continue;
      const state = part.state;
      if (state === "output-available" || state === "output-error") {
        events[name] = "completed";
      } else if (state === "input-streaming" || state === "input-available") {
        events[name] = "running";
      }
    }
  }
  return events;
}

export function CSuiteClient({ stats }: CSuiteClientProps): JSX.Element {
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [briefingMessage, setBriefingMessage] = useState<string | undefined>(undefined);
  const [ceoState, setCEOState] = useState<"idle" | "thinking" | "talking">("idle");
  const [dispatchEvents, setDispatchEvents] = useState<Record<string, "running" | "completed">>({});
  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");

  const handleOpenDialogue = useCallback(() => setDialogueOpen(true), []);
  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
    setBriefingMessage(undefined);
    setCEOState("idle");
  }, []);

  const handleBriefingReady = useCallback((briefing: string) => {
    // Reset dispatch events for a fresh run so the bell's progress cards
    // start clean. The dialogue panel's auto-submit will drive new events.
    setDispatchEvents({});
    setBriefingMessage(briefing);
    setDialogueOpen(true);
    setCEOState("talking");
  }, []);

  const handleCEOStatusChange = useCallback((status: "idle" | "thinking" | "talking") => {
    setCEOState(status);
  }, []);

  const handleChatActivity = useCallback(
    (activity: { messages: UIMessage[]; status: ChatStatus }) => {
      setChatStatus(activity.status);
      const next = extractDispatchEvents(activity.messages);
      setDispatchEvents((prev) => {
        // Cheap equality check — only push when something actually changed.
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length) {
          const same = nextKeys.every((k) => prev[k] === next[k]);
          if (same) return prev;
        }
        return next;
      });
    },
    [],
  );

  const tickerStats = useMemo(() => ({
    pipelineTotal: stats.total,
    offers: stats.offers,
    screening: stats.screening,
    staleCount: stats.staleCount,
    weeklyActivity: stats.weeklyActivity,
  }), [stats]);

  const isStreaming =
    chatStatus === "streaming" || chatStatus === "submitted";

  // ── Content slot (left panel) ────────────────────────────────────────────
  const contentSlot = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        width: "100%",
        maxWidth: "500px",
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
            color: "rgba(201, 168, 76, 0.9)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          The C-Suite
        </h1>
        <p
          style={{
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            fontSize: "11px",
            color: "rgba(107, 83, 32, 0.9)",
            letterSpacing: "0.1em",
            marginTop: "6px",
            textTransform: "uppercase",
          }}
        >
          Executive Command Center
        </p>
      </div>

      {/* CEO character */}
      <CEOCharacter
        onConversationOpen={handleOpenDialogue}
        externalState={ceoState}
        dialogueOpen={dialogueOpen}
      />

      {/* Wall display */}
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <CEOWhiteboard stats={stats} />
      </div>
    </div>
  );

  // ── Panel slot (right panel) ──────────────────────────────────────────────
  const panelSlot = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        width: "100%",
      }}
    >
      <RingTheBell
        onBriefingReady={handleBriefingReady}
        dispatchEvents={dispatchEvents}
        isStreaming={isStreaming}
      />
    </div>
  );

  return (
    <>
      <CSuiteScene
        stats={tickerStats}
        contentSlot={contentSlot}
        panelSlot={panelSlot}
      />

      {/* CEO Dialogue Panel */}
      {dialogueOpen && (
        <div
          role="complementary"
          aria-label="CEO executive briefing panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(460px, 92vw)",
            zIndex: 50,
            animation: "cs-panel-slide-in 0.25s ease-out forwards",
          }}
        >
          <CEODialoguePanel
            isOpen={dialogueOpen}
            onClose={handleCloseDialogue}
            initialMessage={briefingMessage}
            onStatusChange={handleCEOStatusChange}
            onChatActivity={handleChatActivity}
          />
        </div>
      )}

      {dialogueOpen && (
        <div
          role="presentation"
          onClick={handleCloseDialogue}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 49,
            animation: "cs-backdrop-fade-in 0.2s ease-out forwards",
          }}
        />
      )}

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          @keyframes cs-panel-slide-in {
            from { opacity: 0.8; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
}
