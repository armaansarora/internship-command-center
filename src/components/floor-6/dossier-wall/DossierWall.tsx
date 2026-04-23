"use client";

import type { JSX } from "react";
import { DossierCard, type DossierShape } from "./DossierCard";

interface Props {
  dossiers: DossierShape[];
  onOpen?: (id: string) => void;
  now?: Date;
}

/**
 * The CIO's library wall — a grid of dossier folders that age in place.
 * Auto-fills rows of 180px dossier cards; older cards visibly yellow
 * and curl at the top-right corner.
 */
export function DossierWall({ dossiers, onOpen, now }: Props): JSX.Element {
  if (dossiers.length === 0) {
    return (
      <div
        className="dossier-wall-empty"
        role="status"
        aria-live="polite"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Satoshi', sans-serif",
          color: "#C9A84C",
          fontSize: 14,
          opacity: 0.7,
        }}
      >
        <p>No dossiers yet. Track a company to start the wall.</p>
      </div>
    );
  }

  return (
    <div
      className="dossier-wall"
      role="region"
      aria-label={
        `CIO dossier wall: ${dossiers.length} companies. ` +
        "Older dossiers yellow and the top-right corner curls as the research ages."
      }
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, 180px)",
        gap: 28,
        padding: 24,
        overflowY: "auto",
        maxHeight: "100%",
        alignContent: "start",
        justifyContent: "start",
      }}
    >
      {dossiers.map((d) => (
        <DossierCard key={d.id} dossier={d} now={now} onOpen={onOpen} />
      ))}
    </div>
  );
}
