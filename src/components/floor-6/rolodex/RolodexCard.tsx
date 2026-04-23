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

/** Deterministic ±2.5° tilt for sticky notes, seeded by contact id. */
function seededNoteTilt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ((hash % 11) - 5) * 0.5;
}

/**
 * A single physical card on the rolodex cylinder. Warmth-coloured via the
 * cool-blue palette — zero red anywhere. The card is a <button> so flick-to-
 * flip works with keyboard and assistive tech out of the box.
 */
export function RolodexCard({ contact, onFlip, focused }: Props): JSX.Element {
  const tier = computeWarmthTier(contact.warmthScore ?? 0);
  const palette = WARMTH_PALETTE[tier];

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
        background: palette.bg,
        border: `1.5px solid ${palette.edge}`,
        color: palette.text,
        padding: "14px 12px",
        fontFamily: "'Satoshi', sans-serif",
        fontSize: 12,
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 4,
        boxShadow: focused
          ? "0 6px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(201, 168, 76, 0.35)"
          : "0 2px 6px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        opacity: focused ? 1 : 0.88,
        transition: "box-shadow 0.25s ease, opacity 0.25s ease",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "0.01em" }}>
        {contact.name}
      </div>
      {contact.title && (
        <div style={{ fontSize: 11, opacity: 0.85 }}>{contact.title}</div>
      )}
      {contact.companyName && (
        <div
          style={{
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            opacity: 0.72,
          }}
        >
          {contact.companyName}
        </div>
      )}
      <div
        aria-hidden="true"
        style={{
          marginTop: "auto",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.55,
        }}
      >
        {palette.label}
      </div>

      {/* R8 sharpening detail — private sticky-note visible ONLY to the
          owning user.  Rendered as a hand-stuck cream square tilted a few
          degrees.  Never included in any outbound surface (allowlist
          enforced by P5 grep). */}
      {contact.privateNote && (
        <aside
          aria-label="Private note, visible only to you"
          style={{
            position: "absolute",
            top: -10,
            right: -8,
            width: 78,
            minHeight: 46,
            padding: "6px 8px",
            transform: `rotate(${seededNoteTilt(contact.id)}deg)`,
            background: "#FFF8D4",
            color: "#3A2817",
            fontFamily: "'Caveat', 'Bradley Hand', cursive",
            fontSize: 12,
            lineHeight: 1.2,
            boxShadow:
              "0 2px 6px rgba(0,0,0,0.3), inset 0 -4px 6px rgba(0,0,0,0.04)",
            pointerEvents: "none",
            overflow: "hidden",
            whiteSpace: "pre-wrap",
          }}
        >
          {contact.privateNote.slice(0, 60)}
        </aside>
      )}
    </button>
  );
}
