import type { JSX } from "react";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";

interface AgentStatus {
  name: string;
  label: string;
  status: "active" | "idle" | "completed";
  lastAction?: string;
}

interface CEOWhiteboardProps {
  stats: PipelineStats;
  agentStatuses?: AgentStatus[];
  lastBriefingAt?: string | null;
}

const DEFAULT_AGENTS: AgentStatus[] = [
  { name: "CRO", label: "Revenue", status: "idle", lastAction: "Pipeline analyzed" },
  { name: "COO", label: "Operations", status: "idle", lastAction: "Follow-ups queued" },
  { name: "CNO", label: "Networking", status: "idle", lastAction: "Contacts reviewed" },
  { name: "CIO", label: "Intelligence", status: "idle", lastAction: "Companies researched" },
  { name: "CMO", label: "Marketing", status: "idle", lastAction: "Cover letters drafted" },
  { name: "CPO", label: "Strategy", status: "idle", lastAction: "Prep packets updated" },
];

function AgentStatusDot({ status }: { status: AgentStatus["status"] }): JSX.Element {
  const colors = {
    active:    { bg: "rgba(201, 168, 76, 0.9)", shadow: "0 0 8px rgba(201, 168, 76, 0.6)" },
    completed: { bg: "rgba(0, 255, 135, 0.9)", shadow: "0 0 6px rgba(0, 255, 135, 0.5)" },
    idle:      { bg: "rgba(107, 83, 32, 0.5)", shadow: "none" },
  };
  const c = colors[status];
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: c.bg,
        boxShadow: c.shadow,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * CEOWhiteboard — Actually a wall display / control panel.
 * Shows agent network status, recent briefing summary, key metrics.
 */
export function CEOWhiteboard({ stats, agentStatuses = DEFAULT_AGENTS, lastBriefingAt }: CEOWhiteboardProps): JSX.Element {
  return (
    <div
      role="region"
      aria-label="CEO control panel — agent network status"
      style={{
        position: "relative",
        borderRadius: "6px",
        padding: "14px",
        width: "100%",
        background: "rgba(26, 22, 10, 0.9)",
        border: "1px solid rgba(201, 168, 76, 0.2)",
        boxShadow: "inset 0 0 24px rgba(201, 168, 76, 0.04)",
        fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "9px", color: "rgba(184, 146, 74, 0.9)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          AGENT NETWORK
        </span>
        <span style={{ fontSize: "9px", color: "rgba(201, 168, 76, 0.7)", letterSpacing: "0.06em" }}>
          {lastBriefingAt ? `BRIEFED ${new Date(lastBriefingAt).toLocaleDateString()}` : "AWAITING BRIEFING"}
        </span>
      </div>

      {/* Agent rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
        {agentStatuses.map((agent) => (
          <div
            key={agent.name}
            role="group"
            aria-label={`${agent.label} agent: ${agent.status}${agent.lastAction ? ` — ${agent.lastAction}` : ""}`}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <AgentStatusDot status={agent.status} />
            <span style={{ fontSize: "9px", color: "rgba(201, 168, 76, 0.9)", fontWeight: 700, minWidth: "28px" }}>
              {agent.name}
            </span>
            <span style={{ fontSize: "8px", color: "rgba(107, 83, 32, 0.9)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {agent.lastAction ?? "Standby"}
            </span>
          </div>
        ))}
      </div>

      {/* Key metrics */}
      <div style={{ borderTop: "1px solid rgba(201, 168, 76, 0.12)", paddingTop: "10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            { label: "PIPELINE", value: stats.total.toString(), color: "rgba(201, 168, 76, 0.9)" },
            { label: "OFFERS",   value: stats.offers.toString(), color: stats.offers > 0 ? "rgba(0, 255, 135, 0.9)" : "rgba(107, 83, 32, 0.7)" },
            { label: "SCREENS",  value: stats.screening.toString(), color: "rgba(201, 168, 76, 0.7)" },
            { label: "STALE",    value: stats.staleCount.toString(), color: stats.staleCount > 5 ? "rgba(220, 60, 60, 0.8)" : "rgba(107, 83, 32, 0.7)" },
          ].map((m) => (
            <div key={m.label}>
              <span style={{ fontSize: "7px", color: "rgba(107, 83, 32, 0.8)", letterSpacing: "0.08em", display: "block" }}>{m.label}</span>
              <span style={{ fontSize: "16px", color: m.color, fontWeight: 700, lineHeight: 1 }} aria-hidden="true">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", bottom: "6px", right: "8px", fontSize: "7px", color: "rgba(61, 48, 16, 0.9)", transform: "rotate(0.5deg)" }}
      >
        // CEO COMMAND
      </div>
    </div>
  );
}
