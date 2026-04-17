"use client";

import type { JSX } from "react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSoundEngine } from "@/components/world/SoundProvider";

interface AgentProgress {
  name: string;
  label: string;
  /**
   * The CEO orchestrator dispatch tool name that drives this card
   * (`dispatchToCRO`, `dispatchToCOO`, ...). Matched against tool-call
   * events forwarded from the dialogue panel.
   */
  toolKey: string;
  status: "waiting" | "running" | "completed" | "error";
}

interface RingTheBellProps {
  onBriefingReady?: (briefing: string) => void;
  /**
   * Map of dispatch-tool key → state. Driven by CSuiteClient watching the CEO
   * dialogue panel's UIMessage stream for `tool-{name}` parts. The bell uses
   * this to flip its progress cards in lock-step with real subagent activity.
   * Keys: "dispatchToCRO", "dispatchToCOO", "dispatchToCNO", "dispatchToCIO",
   * "dispatchToCMO", "dispatchToCPO".
   */
  dispatchEvents?: Record<string, "running" | "completed">;
  /**
   * True while the CEO dialogue panel is actively streaming a response. Lets
   * the bell auto-transition from "orchestrating" to "complete" when the
   * stream ends.
   */
  isStreaming?: boolean;
}

const AGENTS: Array<{ name: string; label: string; toolKey: string }> = [
  { name: "CRO", label: "Revenue Officer",     toolKey: "dispatchToCRO" },
  { name: "COO", label: "Operations Officer",  toolKey: "dispatchToCOO" },
  { name: "CNO", label: "Networking Officer",  toolKey: "dispatchToCNO" },
  { name: "CIO", label: "Intelligence Officer", toolKey: "dispatchToCIO" },
  { name: "CMO", label: "Marketing Officer",   toolKey: "dispatchToCMO" },
  { name: "CPO", label: "Strategy Officer",    toolKey: "dispatchToCPO" },
];

const BRIEFING_PROMPT =
  "Ring the bell — compile a full morning briefing. Dispatch to CRO for pipeline status, COO for follow-up actions, CNO for networking opportunities, CIO for company intelligence, CMO for content and outreach, CPO for strategic priorities. Synthesize everything into a single executive briefing.";

function BellIcon({ ringing }: { ringing: boolean }): JSX.Element {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={ringing ? "bell-ringing" : ""}
      style={{ display: "block" }}
    >
      <path
        d="M18 4C18 4 10 8 10 18V26H26V18C26 8 18 4 18 4Z"
        fill="rgba(201, 168, 76, 0.25)"
        stroke="rgba(201, 168, 76, 0.9)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="14" y="26" width="8" height="3" rx="1.5" fill="rgba(201, 168, 76, 0.6)" />
      <circle cx="18" cy="32" r="2" fill="rgba(201, 168, 76, 0.8)" />
      <path d="M10 18 C 8 18 7 19 7 20" stroke="rgba(201, 168, 76, 0.4)" strokeWidth="1" strokeLinecap="round" />
      <path d="M26 18 C 28 18 29 19 29 20" stroke="rgba(201, 168, 76, 0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function AgentCard({ agent }: { agent: AgentProgress }): JSX.Element {
  const statusColors = {
    waiting:   { bg: "rgba(61, 48, 16, 0.3)", border: "rgba(61, 48, 16, 0.5)", dot: "rgba(107, 83, 32, 0.6)" },
    running:   { bg: "rgba(201, 168, 76, 0.08)", border: "rgba(201, 168, 76, 0.4)", dot: "rgba(201, 168, 76, 0.9)" },
    completed: { bg: "rgba(0, 255, 135, 0.06)", border: "rgba(0, 255, 135, 0.3)", dot: "rgba(0, 255, 135, 0.9)" },
    error:     { bg: "rgba(220, 60, 60, 0.06)", border: "rgba(220, 60, 60, 0.3)", dot: "rgba(220, 60, 60, 0.9)" },
  };
  const c = statusColors[agent.status];

  const statusLabel = {
    waiting:   "Standing by",
    running:   "Analyzing...",
    completed: "Ready",
    error:     "Error",
  }[agent.status];

  return (
    <div
      role="status"
      aria-label={`${agent.label}: ${statusLabel}`}
      className="cs-briefing-card-appear"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        borderRadius: "6px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: c.dot,
          flexShrink: 0,
          boxShadow: agent.status === "running" ? `0 0 8px ${c.dot}` : undefined,
          animation: agent.status === "running" ? "cs-glow-pulse 1.5s ease-in-out infinite" : undefined,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "10px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(201, 168, 76, 0.9)", fontWeight: 700 }}>
          {agent.name}
        </div>
        <div style={{ fontSize: "9px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: "rgba(107, 83, 32, 0.9)", marginTop: "1px" }}>
          {agent.label}
        </div>
      </div>
      <span
        aria-hidden="true"
        style={{ fontSize: "9px", fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", color: c.dot, letterSpacing: "0.06em" }}
      >
        {statusLabel.toUpperCase()}
      </span>
    </div>
  );
}

/**
 * RingTheBell — Primary orchestration trigger for the CEO floor.
 *
 * Fires the briefing prompt to the CEO dialogue panel via
 * `onBriefingReady`. The panel itself runs the real /api/ceo chat, which
 * invokes the agent-in-tool orchestrator (`buildCEODispatchTools`). As that
 * happens, each `dispatchTo<X>` tool call surfaces in the chat's UIMessage
 * parts; the parent `CSuiteClient` watches those parts and forwards
 * per-subagent state via the `dispatchEvents` prop. This keeps the bell's
 * progress cards coupled 1:1 with real subagent activity — no fake loops.
 */
export function RingTheBell({
  onBriefingReady,
  dispatchEvents,
  isStreaming,
}: RingTheBellProps): JSX.Element {
  // `phase` is the externally-driven UX flow:
  //   idle → ringing → orchestrating → complete (or back to idle via reset)
  const [phase, setPhase] = useState<"idle" | "ringing" | "orchestrating" | "complete">("idle");
  // Reset counter — bumped by handleReset to invalidate downgrade-locks. We
  // can't store the locked state in useState (would require setState-in-effect
  // again); instead we recompute lock-state per render from dispatchEvents +
  // resetSeq via a ref that's safe to mutate during render.
  const [resetSeq, setResetSeq] = useState(0);
  const reducedMotion = useReducedMotion();
  const { playSound } = useSoundEngine();

  // Latch — once a card has flipped to "completed" we don't downgrade it back
  // to "running" if the model dispatches the same subagent twice in a single
  // briefing. Stored in a ref keyed on resetSeq so handleReset clears it.
  const completedLatch = useRef<{ seq: number; keys: Set<string> }>({
    seq: 0,
    keys: new Set(),
  });
  if (completedLatch.current.seq !== resetSeq) {
    completedLatch.current = { seq: resetSeq, keys: new Set() };
  }
  if (dispatchEvents) {
    for (const [key, state] of Object.entries(dispatchEvents)) {
      if (state === "completed") completedLatch.current.keys.add(key);
    }
  }

  // Derive agent progress from props + phase. No mirror state, no
  // setState-in-effect — pure function of inputs. Once `phase === "complete"`
  // any card still in "waiting" is upgraded to "completed" because the
  // streaming finished even if the model never dispatched that subagent.
  const agentProgress: AgentProgress[] = useMemo(() => {
    return AGENTS.map((a) => {
      const event = dispatchEvents?.[a.toolKey];
      let status: AgentProgress["status"] = "waiting";
      if (completedLatch.current.keys.has(a.toolKey)) {
        status = "completed";
      } else if (event === "completed") {
        status = "completed";
      } else if (event === "running") {
        status = "running";
      }
      // When the bell hits "complete" sweep the remaining waiting/running
      // cards forward — the briefing has finished even if the CEO didn't
      // dispatch every department. The "error" status is never set inside
      // this memo (it's a prop-forwardable value we reserved for future
      // use), so no need to guard against it here.
      if (phase === "complete") {
        status = "completed";
      }
      return { ...a, status };
    });
    // resetSeq listed so the memo re-runs after a reset clears the latch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchEvents, phase, resetSeq]);

  // Drive phase transitions from observable props. We use an effect that
  // calls setPhase only when the *external* signal (isStreaming) actually
  // ends — never to mirror state into local state on every render.
  useEffect(() => {
    if (phase !== "orchestrating") return;
    if (isStreaming) return;
    if (!dispatchEvents || Object.keys(dispatchEvents).length === 0) return;
    setPhase("complete");
  }, [isStreaming, phase, dispatchEvents]);

  const handleRing = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("ringing");
    playSound("bell-ring");

    // Bell ring delay (UI flourish — animation only, not orchestrator pacing).
    await new Promise<void>((resolve) =>
      setTimeout(resolve, reducedMotion ? 0 : 700),
    );
    setPhase("orchestrating");

    // Hand the briefing prompt to the dialogue panel; it owns the real
    // /api/ceo chat call. Tool dispatch events flow back via dispatchEvents.
    onBriefingReady?.(BRIEFING_PROMPT);
  }, [phase, reducedMotion, playSound, onBriefingReady]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setResetSeq((n) => n + 1);
  }, []);

  return (
    <div
      role="region"
      aria-label="Ring the Bell — orchestration control"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%", maxWidth: "360px" }}
    >
      {/* Bell button */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          onClick={handleRing}
          disabled={phase !== "idle"}
          aria-label="Ring the bell to start morning briefing"
          aria-busy={phase === "orchestrating"}
          className={`ring-the-bell-btn ${phase === "ringing" ? "gold-pulse-active" : ""}`}
          style={{
            opacity: phase !== "idle" ? 0.7 : 1,
            cursor: phase !== "idle" ? "not-allowed" : "pointer",
          }}
        >
          <BellIcon ringing={phase === "ringing"} />
          <span style={{ fontSize: "14px", letterSpacing: "0.15em" }}>
            {phase === "idle" ? "RING THE BELL" : phase === "complete" ? "BRIEFING READY" : "ORCHESTRATING..."}
          </span>
        </button>

        <p
          style={{
            fontSize: "11px",
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            color: "rgba(107, 83, 32, 0.8)",
            textAlign: "center",
            letterSpacing: "0.04em",
          }}
          aria-live="polite"
        >
          {phase === "idle" && "Assembles a briefing from all 6 department heads"}
          {phase === "ringing" && "Signaling all departments..."}
          {phase === "orchestrating" && "Collecting reports from the C-Suite..."}
          {phase === "complete" && "All departments have reported in"}
        </p>
      </div>

      {/* Agent progress cards */}
      {phase !== "idle" && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
          aria-label="Agent orchestration progress"
          role="group"
        >
          {agentProgress.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>
      )}

      {/* Reset button after complete */}
      {phase === "complete" && (
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset bell — start new briefing"
          style={{
            fontSize: "10px",
            fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
            color: "rgba(107, 83, 32, 0.8)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.08em",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          RESET
        </button>
      )}
    </div>
  );
}
