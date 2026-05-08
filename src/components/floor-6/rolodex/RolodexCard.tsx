"use client";

import type { JSX } from "react";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { computeWarmthTier, WARMTH_PALETTE } from "@/lib/contacts/warmth";

interface Props {
  contact: ContactForAgent;
  onFlip: () => void;
  /** `true` when this card is at the rolodex's 0° front-and-center position. */
  focused: boolean;
}

/**
 * A single physical card on the rolodex cylinder. Warmth-coloured via the
 * cool-blue palette — zero red anywhere. The card is a <button> so flick-to-
 * flip works with keyboard and assistive tech out of the box.
 */
export function RolodexCard({ contact, onFlip, focused }: Props): JSX.Element {
  const tier = computeWarmthTier(contact.warmthScore ?? 0);
  const palette = WARMTH_PALETTE[tier];
  const lastContact =
    contact.lastContactAt === null
      ? "No touch logged"
      : `${contact.daysSinceContact}d since contact`;

  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={
        `Open card for ${contact.name}` +
        (contact.companyName ? ` at ${contact.companyName}` : "") +
        `, ${palette.label}`
      }
      data-warmth-tier={tier}
      tabIndex={focused ? 0 : -1}
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, rgba(255,255,255,0.08), transparent 32%), ${palette.bg}`,
        border: `1.5px solid ${palette.edge}`,
        color: palette.text,
        padding: "16px",
        fontFamily: "'Satoshi', sans-serif",
        fontSize: 13,
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 6,
        boxShadow: focused
          ? "0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(201, 168, 76, 0.42)"
          : "0 6px 18px rgba(0,0,0,0.28)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: focused ? 1 : 0.88,
        transition: "box-shadow 0.25s ease, opacity 0.25s ease, transform 0.25s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "10px",
          border: `1px solid ${palette.edge}`,
          opacity: 0.32,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          opacity: 0.66,
        }}
      >
        <span>Contact file</span>
        <span>{palette.label}</span>
      </div>

      <div
        style={{
          borderBottom: `1px solid ${palette.edge}`,
          paddingBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.05 }}>
          {contact.name}
        </div>
        {contact.title && (
          <div style={{ marginTop: 7, fontSize: 12, opacity: 0.86 }}>
            {contact.title}
          </div>
        )}
        {contact.companyName && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              opacity: 0.74,
            }}
          >
            {contact.companyName}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
        <DossierLine label="Relationship" value={contact.relationship ?? "Unsorted"} />
        <DossierLine label="Last touch" value={lastContact} />
        <DossierLine label="Source" value={contact.source ?? "Manual"} />
      </div>

      {contact.privateNote && (
        <aside
          aria-label="Private note, visible only to you"
          style={{
            marginTop: "auto",
            padding: "9px 10px",
            border: `1px solid ${palette.edge}`,
            borderRadius: 4,
            background: "rgba(255,255,255,0.12)",
            color: palette.text,
            fontFamily: "'Satoshi', sans-serif",
            fontSize: 12,
            lineHeight: 1.3,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.08)",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.66,
            }}
          >
            Private note
          </span>
          {contact.privateNote.slice(0, 60)}
        </aside>
      )}
    </button>
  );
}

function DossierLine({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "78px 1fr",
        gap: 8,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          opacity: 0.58,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.25, opacity: 0.88 }}>
        {value}
      </span>
    </div>
  );
}
