"use client";

import type { JSX } from "react";
import type { ContactStats, ContactForAgent } from "@/lib/db/queries/contacts-rest";

interface CNOWhiteboardProps {
  stats: ContactStats;
  coolingContacts?: ContactForAgent[];
  coldContacts?: ContactForAgent[];
}

// ---------------------------------------------------------------------------
// Warmth distribution bar
// ---------------------------------------------------------------------------
function WarmthBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}): JSX.Element {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barWidth = Math.max(pct * 0.9, count > 0 ? 4 : 1);

  return (
    <div
      role="group"
      aria-label={`${label}: ${count} contacts (${pct}%)`}
      className="flex items-center gap-2"
    >
      <span
        style={{
          fontSize: "9px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#7A5B35",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          width: "52px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        aria-hidden="true"
        style={{
          flex: 1,
          height: "6px",
          backgroundColor: "rgba(92, 58, 30, 0.4)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: "3px",
            opacity: count > 0 ? 0.85 : 0.2,
            transition: "width 0.4s ease-out",
          }}
        />
      </div>
      <span
        aria-hidden="true"
        style={{
          fontSize: "11px",
          fontFamily: "IBM Plex Mono, monospace",
          color,
          fontWeight: 700,
          width: "22px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cooling alert row
// ---------------------------------------------------------------------------
function CoolingAlertRow({
  contact,
}: {
  contact: ContactForAgent;
}): JSX.Element {
  const isCold = contact.warmthLevel === "cold";
  // R8 cool-blue palette — cold is a muted blue-grey, not a warning. Cooling
  // is a pale slate. No red anywhere on a cold card.
  const color = isCold ? "#6E7E8F" : "#8892A0";

  return (
    <div
      aria-label={`${contact.name} at ${contact.companyName ?? "unknown"}: ${contact.daysSinceContact} days since contact`}
      className="flex items-center justify-between gap-2"
      style={{
        padding: "4px 6px",
        borderRadius: "3px",
        backgroundColor: isCold
          ? "rgba(110, 126, 143, 0.07)"
          : "rgba(136, 146, 160, 0.06)",
        border: `1px solid ${isCold ? "rgba(110, 126, 143, 0.2)" : "rgba(136, 146, 160, 0.18)"}`,
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#FDF3E8",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
      >
        {contact.name}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: "10px",
          fontFamily: "IBM Plex Mono, monospace",
          color,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {contact.daysSinceContact}d
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company network mini-grid
// ---------------------------------------------------------------------------
function CompanyNetworkGrid({ stats }: { stats: ContactStats }): JSX.Element {
  return (
    <div
      role="group"
      aria-label={`Company network: ${stats.companiesRepresented} companies represented`}
      className="flex flex-col gap-1"
    >
      <div className="flex items-baseline gap-2">
        <span
          aria-hidden="true"
          style={{
            fontSize: "28px",
            fontFamily: "IBM Plex Mono, monospace",
            fontWeight: 700,
            color: "#C9A84C",
            lineHeight: 1,
            display: "inline-block",
            transform: "rotate(-0.5deg)",
            transition: "color 0.3s ease",
          }}
        >
          {stats.companiesRepresented}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontFamily: "IBM Plex Mono, monospace",
            color: "#7A5B35",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          COMPANIES
        </span>
      </div>
      {stats.recentActivity > 0 && (
        <span
          style={{
            fontSize: "9px",
            fontFamily: "IBM Plex Mono, monospace",
            color: "#C4925A",
          }}
          aria-hidden="true"
        >
          +{stats.recentActivity} active this week
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main whiteboard component
// ---------------------------------------------------------------------------
export function CNOWhiteboard({
  stats,
  coolingContacts = [],
  coldContacts = [],
}: CNOWhiteboardProps): JSX.Element {
  const alertContacts = [...coldContacts.slice(0, 2), ...coolingContacts.slice(0, 2)].slice(0, 3);

  return (
    <div
      role="region"
      aria-label="CNO network whiteboard"
      className="relative rounded-md p-4 w-full"
      style={{
        backgroundColor: "#231508",
        border: "1px solid #5C3A1E",
        boxShadow: "inset 0 0 24px rgba(201, 168, 76, 0.04)",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      {/* Board header */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontSize: "10px",
            color: "#C4925A",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            transform: "rotate(-0.3deg)",
            display: "inline-block",
          }}
        >
          NETWORK // LIVE
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#C9A84C",
            fontWeight: 700,
          }}
          aria-label={`Total contacts: ${stats.total}`}
        >
          {stats.total} CONTACTS
        </span>
      </div>

      {/* Warmth distribution bars */}
      <div
        role="img"
        aria-label="Network warmth distribution"
        className="flex flex-col gap-2 mb-4"
      >
        <WarmthBar
          label="WARM"
          count={stats.warm}
          total={stats.total}
          color="#C9A84C"
        />
        <WarmthBar
          label="COOLING"
          count={stats.cooling}
          total={stats.total}
          color="#8892A0"
        />
        <WarmthBar
          label="COLD"
          count={stats.cold}
          total={stats.total}
          color="#6E7E8F"
        />
      </div>

      {/* Company count */}
      <div
        className="border-t pt-3 mb-4"
        style={{ borderColor: "#5C3A1E" }}
      >
        <CompanyNetworkGrid stats={stats} />
      </div>

      {/* Cooling/cold alerts */}
      {alertContacts.length > 0 && (
        <div
          className="border-t pt-3"
          style={{ borderColor: "#5C3A1E" }}
          role="region"
          aria-label="Contacts needing attention"
        >
          <span
            style={{
              fontSize: "9px",
              color: "#F59E0B",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "6px",
            }}
          >
            ⚠ NEEDS ATTENTION
          </span>
          <div className="flex flex-col gap-1.5">
            {alertContacts.map((c) => (
              <CoolingAlertRow key={c.id} contact={c} />
            ))}
          </div>
        </div>
      )}

      {/* Decorative signature */}
      <div
        aria-hidden="true"
        className="absolute bottom-2 right-3"
        style={{
          fontSize: "8px",
          color: "#5C3A1E",
          fontFamily: "IBM Plex Mono, monospace",
          transform: "rotate(1deg)",
        }}
      >
        {"// CNO METRICS"}
      </div>
    </div>
  );
}
