"use client";

import type { JSX } from "react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { UIMessage, ChatStatus } from "ai";
import { isToolUIPart, getToolName } from "ai";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import { CSuiteScene } from "./CSuiteScene";
import { CEOCharacter } from "./ceo-character/CEOCharacter";
import { CEODialoguePanel } from "./ceo-character/CEODialoguePanel";
import { CEOWhiteboard } from "./ceo-character/CEOWhiteboard";
import { RingTheBell } from "./RingTheBell";
import { InjectPrompt } from "./InjectPrompt";
import { DispatchGraph, DISPATCH_GRAPH_AGENTS } from "./DispatchGraph";
import type {
  DispatchEntry,
  DispatchNodeStatus,
} from "./DispatchGraph";
import { useDispatchProgress } from "@/hooks/useDispatchProgress";
import type { DispatchProgressMap } from "@/hooks/useDispatchProgress";
import { ParlorDoor } from "@/components/parlor/ParlorDoor";
import { PARLOR_DOOR_SEEN_PREF_KEY } from "@/lib/preferences/parlor-door-seen-pref";

type BellPhase = "idle" | "ringing" | "orchestrating" | "complete";

/**
 * pure decision helper for the `/`-keystroke listener. Opens the
 * inject prompt ONLY when:
 *   - the dialogue panel is currently mounted (`dialogueOpen`), so there's
 *     somewhere for the inject to land;
 *   - the bell has reached `orchestrating` or `complete` (there's something
 *     in flight to direct — no point injecting into a cold chat);
 *   - the inject prompt is not already open (don't re-trigger);
 *   - the user isn't typing in another input / textarea / contenteditable —
 *     we don't want to hijack `/` while the user is composing a message in
 *     the CEO panel itself or any other input anywhere on the page.
 *
 * Extracted so the branching logic is unit-testable without wiring up a
 * full JSDOM window + keyboard event synthesis. The `useEffect` handler in
 * CSuiteClient just passes `document.activeElement` + current state into
 * this helper and branches on its boolean return.
 */
export function shouldOpenInjectOnSlash(
  bellPhase: BellPhase,
  dialogueOpen: boolean,
  injectOpen: boolean,
  activeElement: Element | null,
): boolean {
  if (!dialogueOpen) return false;
  if (injectOpen) return false;
  if (bellPhase !== "orchestrating" && bellPhase !== "complete") return false;
  if (activeElement instanceof HTMLElement) {
    const tag = activeElement.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return false;
    if (activeElement.isContentEditable) return false;
  }
  return true;
}

interface CSuiteClientProps {
  stats: PipelineStats;
  /**
   * Gate for the Negotiation Parlor door. True only when the
   * server computed `offerCount > 0`. When false we pass NO `doorSlot`
   * prop to CSuiteScene — the door is ABSENT from the DOM, not hidden.
   * Invariant locked in `r10-parlor-door-absence.proof.test.tsx`.
   */
  hasParlorDoor?: boolean;
  /**
   * True on the very first render after an offer parses.
   * Drives the 2.3s cinematic materialization beat. After the beat
   * completes the client POSTs `parlorDoorSeen=true` so subsequent
   * visits arrive with `firstAppearance=false`.
   */
  firstAppearance?: boolean;
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

/**
 * Walk the assistant messages in reverse, looking for the most recent
 * `dispatchBatch` tool part that has reached `output-available`. The tool's
 * output (generated inside `execute` in R3.3) carries `{ requestId, agents }`
 * — and requestId is the bell-ring correlation id the polling endpoint needs.
 *
 * R3.7 design note on why we walk from the output (not the input):
 *   R3.3's `dispatchBatch.execute` generates the `requestId` itself via
 *   `crypto.randomUUID()`. That means the input stream never carries it — we
 *   only see it once the tool returns. That's too late for fine-grained
 *   streaming visibility, so we bridge the window with `dispatchEvents`:
 *   during streaming the graph runs on `tool-dispatchTo*` lifecycle parts,
 *   then once `dispatchBatch` resolves we start polling to enrich with
 *   `started_at`/`completed_at` for the return-streak animation. By that
 *   point all rows are terminal, so the hook resolves in one shot and stops.
 *
 * Returns the latest (most-recent-message-first) requestId when it's a
 * non-empty string, else `null`.
 *
 * Exported for direct unit tests.
 */
export function extractBatchRequestId(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant" || !Array.isArray(msg.parts)) continue;
    for (const part of msg.parts) {
      if (!isToolUIPart(part)) continue;
      if (getToolName(part) !== "dispatchBatch") continue;
      if (part.state !== "output-available") continue;
      const out = part.output as unknown;
      if (
        out !== null &&
        typeof out === "object" &&
        "requestId" in out &&
        typeof (out as { requestId: unknown }).requestId === "string" &&
        (out as { requestId: string }).requestId.length > 0
      ) {
        return (out as { requestId: string }).requestId;
      }
    }
  }
  return null;
}

/**
 * Convert the polling-hook output + the streaming dispatchEvents into a
 * single `dispatches` map the graph understands.
 *
 * Priority rules:
 *   - `progressMap[agent]` wins when present (richer data — carries
 *     startedAt / completedAt).
 *   - Falls back to `dispatchEvents["dispatchTo" + AGENT]` when no polling
 *     row exists yet (during the streaming window before dispatchBatch
 *     returns).
 *   - Else `idle` — graph renders a dim satellite.
 *
 * Polling statuses `queued` and `running` both collapse to the graph's
 * `running` visual token; the graph has no distinct "queued" colour because
 * the user can't distinguish 300ms queue from 300ms execution.
 *
 * Exported for direct unit tests.
 */
export function mergeGraphDispatches(
  progressMap: DispatchProgressMap,
  dispatchEvents: Record<string, "running" | "completed">,
): Record<string, DispatchEntry> {
  const out: Record<string, DispatchEntry> = {};
  for (const agent of DISPATCH_GRAPH_AGENTS) {
    const polled = progressMap[agent];
    if (polled) {
      const mappedStatus: DispatchNodeStatus =
        polled.status === "completed"
          ? "completed"
          : polled.status === "failed"
          ? "failed"
          : "running"; // queued + running both map to "running" visually
      out[agent] = {
        status: mappedStatus,
        startedAt: polled.startedAt,
        completedAt: polled.completedAt,
      };
      continue;
    }
    const eventKey = "dispatchTo" + agent.toUpperCase();
    const event = dispatchEvents[eventKey];
    if (event) {
      out[agent] = {
        status: event, // "running" | "completed"
        startedAt: null,
        completedAt: null,
      };
      continue;
    }
    out[agent] = { status: "idle", startedAt: null, completedAt: null };
  }
  return out;
}

export function CSuiteClient({
  stats,
  hasParlorDoor = false,
  firstAppearance = false,
}: CSuiteClientProps): JSX.Element {
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [briefingMessage, setBriefingMessage] = useState<string | undefined>(undefined);
  const [ceoState, setCEOState] = useState<"idle" | "thinking" | "talking">("idle");
  const [dispatchEvents, setDispatchEvents] = useState<Record<string, "running" | "completed">>({});
  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");
  // mirror of RingTheBell's internal phase. Surfaced via the new
  // `onPhaseChange` prop on the bell, then forwarded down to CSuiteScene as
  // `bellPhase` so the scene root can carry `data-bell-phase` for CSS-driven
  // camera-pullback + atmospheric dim.
  const [bellPhase, setBellPhase] = useState<BellPhase>("idle");
  // `/`-inject floating prompt visibility.
  const [injectOpen, setInjectOpen] = useState(false);
  // handler the CEO dialogue panel registers on mount via
  // `registerInject`. When the user submits the inject prompt we call this
  // to push their directive into the active chat.
  const injectRef = useRef<((text: string) => void) | null>(null);
  // The current bell-ring's correlation id, extracted from dispatchBatch's
  // tool output once it resolves. Null during the streaming window (graph
  // runs on dispatchEvents alone during that time) and also null for
  // single-tool flows that don't use dispatchBatch at all.
  const [batchRequestId, setBatchRequestId] = useState<string | null>(null);

  const handleOpenDialogue = useCallback(() => setDialogueOpen(true), []);
  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
    setBriefingMessage(undefined);
    setCEOState("idle");
    setInjectOpen(false);
  }, []);

  // the CEO dialogue panel calls this on mount with a function we
  // can invoke to push a message into the chat. Stable identity so the
  // panel's effect dep array doesn't re-fire on every CSuiteClient render.
  const registerInject = useCallback((fn: (text: string) => void) => {
    injectRef.current = fn;
  }, []);

  const handleInjectClose = useCallback(() => setInjectOpen(false), []);

  const handleInjectSubmit = useCallback((text: string) => {
    injectRef.current?.(text);
    setInjectOpen(false);
  }, []);

  // global `/` listener. Only active while the dialogue panel is
  // mounted AND the bell has reached orchestrating/complete. The decision
  // logic is factored into `shouldOpenInjectOnSlash` above so it can be
  // unit-tested without a full JSDOM event loop.
  useEffect(() => {
    if (!dialogueOpen) return;
    if (bellPhase !== "orchestrating" && bellPhase !== "complete") return;

    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      if (
        !shouldOpenInjectOnSlash(
          bellPhase,
          dialogueOpen,
          injectOpen,
          document.activeElement,
        )
      ) {
        return;
      }
      e.preventDefault();
      setInjectOpen(true);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogueOpen, bellPhase, injectOpen]);

  const handleBriefingReady = useCallback((briefing: string) => {
    // Reset dispatch events + requestId for a fresh run so the bell's
    // progress cards and the graph both start clean. The dialogue panel's
    // auto-submit will drive new events.
    setDispatchEvents({});
    setBatchRequestId(null);
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

      // Watch for dispatchBatch resolution so we can start polling for the
      // timing-enrichment pass. Only update state when the value actually
      // changes (typical: null → uuid at most once per bell-ring).
      const nextRequestId = extractBatchRequestId(activity.messages);
      setBatchRequestId((prev) => (prev === nextRequestId ? prev : nextRequestId));
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

  // Polling kicks in only once `batchRequestId` is set (i.e., dispatchBatch
  // has already returned). Since all dispatch rows are terminal by then, the
  // first poll fetches the full state and the hook stops on its own. We
  // keep `isStreaming` folded into the active flag so polling paginates
  // cleanly into dormancy after streaming ends.
  const progressMap = useDispatchProgress(
    batchRequestId,
    // Poll while we have an id; the hook itself will self-terminate once
    // every row is terminal. Gating on isStreaming here would wipe the
    // graph's timing data the moment the stream finishes — we want to
    // retain the enriched state for the return streak.
    batchRequestId !== null,
  );

  // Merge live streaming events (from dispatchEvents) with timing-enriched
  // polling data (from progressMap). See `mergeGraphDispatches` for priority
  // rules. Memoized against the three inputs so the graph only re-renders
  // when something actually changes.
  const graphDispatches = useMemo(
    () => mergeGraphDispatches(progressMap, dispatchEvents),
    [progressMap, dispatchEvents],
  );

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

  // ── Graph slot (right panel, top) ─────────────────────────────────────────
  const graphSlot = <DispatchGraph dispatches={graphDispatches} />;

  // ── Panel slot (right panel, bottom) ──────────────────────────────────────
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
        onPhaseChange={setBellPhase}
      />
    </div>
  );

  // ── Door slot (C-Suite left column, bottom-right) ───────────────────────
  // The Negotiation Parlor door. MUST be truly undefined when the
  // user has zero offers — the CSuiteScene's absence invariant depends on
  // NOT receiving the prop (see r10-parlor-door-absence.proof.test.tsx).
  // Don't pass `null`, don't pass `false && <ParlorDoor />` — just don't
  // pass the prop at all.
  const handleFirstAppearanceDone = useCallback(async (): Promise<void> => {
    try {
      await fetch("/api/profile/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PARLOR_DOOR_SEEN_PREF_KEY,
          value: { seen: true },
        }),
      });
    } catch {
      // Silent — the worst-case outcome is the user sees the animation
      // again on their next visit, which is mildly annoying but harmless.
      // Avoid pushing a noisy toast for a purely cosmetic latch.
    }
  }, []);

  const doorSlot = hasParlorDoor ? (
    <ParlorDoor
      firstAppearance={firstAppearance}
      onFirstAppearanceDone={handleFirstAppearanceDone}
    />
  ) : undefined;

  return (
    <>
      <CSuiteScene
        stats={tickerStats}
        contentSlot={contentSlot}
        graphSlot={graphSlot}
        panelSlot={panelSlot}
        bellPhase={bellPhase}
        {...(doorSlot !== undefined ? { doorSlot } : {})}
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
            registerInject={registerInject}
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

      {/* R3.11 — `/`-inject floating prompt. Rendered at the top level so it
          layers above the dialogue panel's backdrop (z-index 60 vs 49/50). */}
      <InjectPrompt
        open={injectOpen}
        onClose={handleInjectClose}
        onSubmit={handleInjectSubmit}
      />

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
