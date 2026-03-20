"use client";

import type { JSX } from "react";
import { useState, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AgentProgress {
  name: string;
  label: string;
  status: "waiting" | "running" | "completed" | "error";
}

interface RingTheBellProps {
  onBriefingReady?: (briefing: string) => void;
}

const AGENTS: Array<{ name: string; label: string }> = [
  { name: "CRO", label: "Revenue Officer" },
  { name: "COO", label: "Operations Officer" },
  { name: "CNO", label: "Networking Officer" },
  { name: "CIO", label: "Intelligence Officer" },
  { name: "CMO", label: "Marketing Officer" },
  { name: "CPO", label: "Strategy Officer" },
];

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
 * RingTheBell — The primary orchestration trigger for the CEO floor.
 * Dispatches to /api/ceo, shows agent progress cards, delivers briefing.
 */
export function RingTheBell({ onBriefingReady }: RingTheBellProps): JSX.Element {
  const [phase, setPhase] = useState<"idle" | "ringing" | "orchestrating" | "complete">("idle");
  const [agentProgress, setAgentProgress] = useState<AgentProgress[]>(
    AGENTS.map((a) => ({ ...a, status: "waiting" as const }))
  );
  const reducedMotion = useReducedMotion();

  const handleRing = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("ringing");

    // Step 1: Bell animation
    await new Promise<void>((resolve) => setTimeout(resolve, reducedMotion ? 0 : 700));
    setPhase("orchestrating");

    // Step 2: Simulate agent progress (real orchestration goes through /api/ceo)
    // We light up each agent sequentially to show progress
    for (let i = 0; i < AGENTS.length; i++) {
      setAgentProgress((prev) =>
        prev.map((a, idx) => idx === i ? { ...a, status: "running" } : a)
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      setAgentProgress((prev) =>
        prev.map((a, idx) => idx === i ? { ...a, status: "completed" } : a)
      );
    }

    setPhase("complete");
    // Signal parent to open CEO dialogue with ring-the-bell prompt
    onBriefingReady?.("Ring the bell — compile a full morning briefing from all department heads. CRO: pipeline status. COO: follow-up actions. CNO: networking opportunities. CIO: company intelligence. CMO: content and outreach. CPO: strategic priorities. Go.");
  }, [phase, reducedMotion, onBriefingReady]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setAgentProgress(AGENTS.map((a) => ({ ...a, status: "waiting" as const })));
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
