"use client";

import type { JSX } from "react";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";

interface ContactCardProps {
  contact: ContactForAgent;
  onEdit: (contact: ContactForAgent) => void;
}

const WARMTH_CONFIG = {
  warm: {
    dotClass: "warmth-dot-warm",
    color: "#4ADE80",
    label: "Warm",
    cardClass: "contact-card contact-card-warm",
  },
  cooling: {
    dotClass: "warmth-dot-cooling",
    color: "#F59E0B",
    label: "Cooling",
    cardClass: "contact-card contact-card-cooling",
  },
  cold: {
    dotClass: "warmth-dot-cold",
    color: "#EF4444",
    label: "Cold",
    cardClass: "contact-card contact-card-cold",
  },
} as const;

function formatDaysSince(days: number): string {
  if (days === 999) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getRelationshipLabel(type: string | null): string {
  const labels: Record<string, string> = {
    alumni: "Alumni",
    recruiter: "Recruiter",
    referral: "Referral",
    cold: "Cold Outreach",
    warm_intro: "Warm Intro",
  };
  return type ? (labels[type] ?? type) : "";
}

export function ContactCard({ contact, onEdit }: ContactCardProps): JSX.Element {
  const warmth = WARMTH_CONFIG[contact.warmthLevel];
  const relationshipLabel = getRelationshipLabel(contact.relationship);

  return (
    <article
      aria-label={`Contact: ${contact.name}${contact.companyName ? ` at ${contact.companyName}` : ""}, ${warmth.label}`}
      className={warmth.cardClass}
      style={{ padding: "12px" }}
    >
      {/* Header row: name + warmth dot */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className={warmth.dotClass}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'Satoshi', sans-serif",
              fontWeight: 600,
              color: "#FDF3E8",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contact.name}
          </span>
        </div>

        {/* Days since contact */}
        <span
          aria-label={`Last contact: ${formatDaysSince(contact.daysSinceContact)}`}
          style={{
            fontSize: "10px",
            fontFamily: "IBM Plex Mono, monospace",
            color: warmth.color,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {formatDaysSince(contact.daysSinceContact)}
        </span>
      </div>

      {/* Title */}
      {contact.title && (
        <div
          style={{
            fontSize: "11px",
            fontFamily: "'Satoshi', sans-serif",
            color: "#C4925A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "2px",
          }}
        >
          {contact.title}
        </div>
      )}

      {/* Company */}
      {contact.companyName && (
        <div
          style={{
            fontSize: "11px",
            fontFamily: "IBM Plex Mono, monospace",
            color: "#7A5B35",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "6px",
          }}
        >
          {contact.companyName}
        </div>
      )}

      {/* Footer: relationship + edit button */}
      <div className="flex items-center justify-between gap-2">
        {relationshipLabel ? (
          <span
            style={{
              fontSize: "9px",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#5C3A1E",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              border: "1px solid #5C3A1E",
              borderRadius: "2px",
              padding: "1px 5px",
            }}
          >
            {relationshipLabel}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={() => onEdit(contact)}
          aria-label={`Edit contact ${contact.name}`}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C] rounded"
          style={{
            fontSize: "10px",
            fontFamily: "IBM Plex Mono, monospace",
            color: "#7A5B35",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
            letterSpacing: "0.06em",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#C9A84C";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#7A5B35";
          }}
        >
          EDIT
        </button>
      </div>
    </article>
  );
}
