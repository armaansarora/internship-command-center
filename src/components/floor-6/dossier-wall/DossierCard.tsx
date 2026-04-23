"use client";

import type { JSX } from "react";
import {
  computeDossierAge,
  DOSSIER_AGE_STYLE,
} from "./dossier-age";

export interface DossierShape {
  id: string;
  companyName: string;
  sector: string | null;
  lastResearchedAt: Date | null;
  hasNotes: boolean;
  domain: string | null;
}

interface Props {
  dossier: DossierShape;
  now?: Date;
  onOpen?: (id: string) => void;
}

/**
 * A single dossier folder on the CIO's library wall. Tilts a hair ±2°
 * (seeded off the id so the same card always tilts the same way), and
 * ages visually via `.dossier-curl-*` CSS rules — fresh cards sit flat,
 * aging cards fold the top-right corner, stale cards fully curl with a
 * drop shadow under the lifted corner.
 */
export function DossierCard({ dossier, now = new Date(), onOpen }: Props): JSX.Element {
  const age = computeDossierAge(dossier.lastResearchedAt, now);
  const style = DOSSIER_AGE_STYLE[age];
  const tilt = seededTilt(dossier.id);

  const Component = onOpen ? "button" : "article";

  return (
    <Component
      type={onOpen ? "button" : undefined}
      onClick={onOpen ? () => onOpen(dossier.id) : undefined}
      data-dossier={dossier.id}
      data-age={age}
      className={`dossier-card dossier-curl-${age}`}
      style={{
        width: 180,
        height: 220,
        background: style.bg,
        filter: style.filter,
        boxShadow: style.shadow,
        transform: `rotate(${tilt}deg)`,
        position: "relative",
        padding: 14,
        fontFamily: "'Satoshi', sans-serif",
        fontSize: 12,
        color: "#3A2817",
        border: "none",
        borderRadius: 2,
        textAlign: "left",
        cursor: onOpen ? "pointer" : "default",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
      aria-label={`Dossier: ${dossier.companyName}${dossier.sector ? `, ${dossier.sector}` : ""}, ${style.label}`}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{dossier.companyName}</div>
      {dossier.sector && (
        <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>{dossier.sector}</div>
      )}
      {dossier.domain && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            opacity: 0.6,
            marginTop: 8,
          }}
        >
          {dossier.domain}
        </div>
      )}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 12,
          left: 14,
          fontSize: 9,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.55,
        }}
      >
        {style.label}
      </div>
    </Component>
  );
}

/** Deterministic tilt in the range -3°..+3° from the dossier id. */
function seededTilt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ((hash % 7) - 3) * 0.6;
}
