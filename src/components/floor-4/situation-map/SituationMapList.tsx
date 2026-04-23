"use client";

import { useCallback, type JSX } from "react";
import type { MapShape } from "@/lib/situation/outreach-arcs";
import { useRingPulse } from "../rings/useRingPulse";

interface Props {
  shape: MapShape;
  companyNameById: Record<string, string>;
}

/**
 * Two-column honest fallback for the Situation Map. Shipped when:
 *  - prefers-reduced-motion is on
 *  - viewport is < 720px
 *  - canvas feature-detect fails
 *
 * NOT a decorative consolation prize — same click-pings-rings interaction
 * as the canvas, same data source, same empty-state copy.
 */
export function SituationMapList({ shape, companyNameById }: Props): JSX.Element {
  const rings = useRingPulse();

  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      rings.pulse(e.clientX, e.clientY);
    },
    [rings],
  );

  const outgoing = shape.arcs.filter((a) => a.kind === "active" || a.kind === "draft");
  const incoming = shape.arcs.filter((a) => a.kind === "completed");

  if (shape.arcs.length === 0) {
    return (
      <div
        data-situation-map="empty"
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#7A5B35",
        }}
      >
        The Situation Room is quiet.
      </div>
    );
  }

  return (
    <section
      data-situation-map="list"
      aria-label="Outreach in flight — list view"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        padding: "14px 16px",
        background: "rgba(10, 12, 24, 0.40)",
        border: "1px solid rgba(220, 124, 40, 0.16)",
        borderRadius: 4,
        marginBottom: 18,
      }}
    >
      <Column title="Outgoing" count={outgoing.length}>
        {outgoing.map((a) => (
          <Row
            key={a.id}
            label={companyNameById[a.fromCompanyId] ?? "—"}
            kind={a.kind}
            onClick={handleRowClick}
          />
        ))}
      </Column>
      <Column title="Incoming" count={incoming.length}>
        {incoming.map((a) => (
          <Row
            key={a.id}
            label={companyNameById[a.fromCompanyId] ?? "—"}
            kind={a.kind}
            onClick={handleRowClick}
          />
        ))}
      </Column>
    </section>
  );
}

function Column({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#DC7C28",
          fontWeight: 700,
        }}
      >
        {title} · {count}
      </header>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {children}
        {count === 0 && (
          <li
            style={{
              padding: "8px 12px",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 11,
              color: "#7A5B35",
            }}
          >
            —
          </li>
        )}
      </ul>
    </div>
  );
}

function Row({
  label,
  kind,
  onClick,
}: {
  label: string;
  kind: "active" | "draft" | "completed";
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
}): JSX.Element {
  const accent = kind === "active" ? "#F0A050" : kind === "completed" ? "#6FB26F" : "#7A5B35";
  const dotGlow = kind === "active" ? "glow" : "";
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onClick({
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
          } as unknown as React.MouseEvent<HTMLElement>);
        }
      }}
      data-arc-kind={kind}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: `${accent}0A`,
        border: `1px solid ${accent}30`,
        borderRadius: 3,
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 12,
        color: "#FDF3E8",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: accent,
          boxShadow: dotGlow ? `0 0 6px ${accent}` : "none",
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: accent,
          flexShrink: 0,
        }}
      >
        {kind}
      </span>
    </li>
  );
}
