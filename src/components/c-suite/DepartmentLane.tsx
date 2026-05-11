"use client";

import type { JSX } from "react";
import { useCallback, useState } from "react";
import {
  HandoffDossierCard,
  type Dossier,
} from "./HandoffDossierCard";

/**
 * DepartmentLane — single agent's lane inside a Council Table.
 *
 * Wraps `HandoffDossierCard` with the approve/reject footer the user actually
 * interacts with. The lane is the witnessed decision surface; the card itself
 * stays read-only so it can be reused outside the table (notifications,
 * deep-links).
 *
 * Decision callbacks are intentionally typed as
 * `(dossierId: string) => Promise<void>` — this component is "dumb-ish": it
 * only knows how to disable its own buttons during in-flight requests. The
 * parent (CouncilTable, which itself proxies up to a server action) owns the
 * actual mutation, the optimistic update, and any toast logic.
 *
 * a11y notes:
 *   - The lane is an `<article role="region" aria-label="{owner} dossier">`
 *     per the brief.
 *   - Approve / Reject buttons carry visible labels AND aria-disabled when
 *     they are not actionable (status !== "ready" or while pending) so screen
 *     readers convey the same state hearing users see.
 */
export interface DepartmentLaneProps {
  dossier: Dossier;
  /** Parent owns the real mutation. Called with the dossier id. */
  onApprove: (dossierId: string) => Promise<void>;
  onReject: (dossierId: string) => Promise<void>;
  /** Optional className passthrough. */
  className?: string;
}

type LanePending = "idle" | "approving" | "rejecting";

export function DepartmentLane({
  dossier,
  onApprove,
  onReject,
  className,
}: DepartmentLaneProps): JSX.Element {
  const [pending, setPending] = useState<LanePending>("idle");
  const [expanded, setExpanded] = useState(false);

  const actionable = dossier.status === "ready" && pending === "idle";
  const ownerLabel = dossier.owner.toUpperCase();
  const regionLabel = `${ownerLabel} dossier`;

  const handleApprove = useCallback(async (): Promise<void> => {
    if (!actionable) return;
    setPending("approving");
    try {
      await onApprove(dossier.id);
    } finally {
      setPending("idle");
    }
  }, [actionable, dossier.id, onApprove]);

  const handleReject = useCallback(async (): Promise<void> => {
    if (!actionable) return;
    setPending("rejecting");
    try {
      await onReject(dossier.id);
    } finally {
      setPending("idle");
    }
  }, [actionable, dossier.id, onReject]);

  return (
    <article
      role="region"
      aria-label={regionLabel}
      data-testid="department-lane"
      data-dossier-id={dossier.id}
      data-owner={dossier.owner}
      data-status={dossier.status}
      data-pending={pending}
      data-expanded={expanded ? "true" : "false"}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minWidth: 0,
      }}
    >
      {/* The dossier card — read-only, owns the visual identity. */}
      <HandoffDossierCard
        dossier={dossier}
        expanded={expanded}
        hideToggle
      />

      {/* Lane-level details toggle + approve / reject buttons. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          aria-expanded={expanded}
          data-testid="department-lane-toggle"
          style={{
            background: "transparent",
            border: "1px solid rgba(201, 168, 76, 0.3)",
            color: "rgba(232, 201, 106, 0.9)",
            borderRadius: "6px",
            padding: "6px 10px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
            minHeight: "32px",
          }}
        >
          {expanded ? "Hide details" : "Inspect"}
        </button>

        <div style={{ flex: 1, minWidth: "8px" }} />

        <button
          type="button"
          onClick={handleReject}
          aria-disabled={!actionable}
          aria-label={`Reject ${ownerLabel} recommendation`}
          disabled={!actionable}
          data-testid="department-lane-reject"
          style={{
            background: actionable ? "rgba(255, 107, 107, 0.08)" : "rgba(60, 60, 70, 0.3)",
            border: `1px solid ${actionable ? "rgba(255, 107, 107, 0.55)" : "rgba(107, 114, 128, 0.4)"}`,
            color: actionable ? "rgba(255, 130, 130, 0.95)" : "rgba(160, 160, 175, 0.6)",
            borderRadius: "8px",
            padding: "8px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: actionable ? "pointer" : "not-allowed",
            minHeight: "36px",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          {pending === "rejecting" ? "Rejecting…" : "Reject"}
        </button>

        <button
          type="button"
          onClick={handleApprove}
          aria-disabled={!actionable}
          aria-label={`Approve ${ownerLabel} recommendation`}
          disabled={!actionable}
          data-testid="department-lane-approve"
          style={{
            background: actionable ? "rgba(201, 168, 76, 0.18)" : "rgba(60, 60, 70, 0.3)",
            border: `1px solid ${actionable ? "rgba(232, 201, 106, 0.7)" : "rgba(107, 114, 128, 0.4)"}`,
            color: actionable ? "rgba(255, 222, 130, 0.98)" : "rgba(160, 160, 175, 0.6)",
            borderRadius: "8px",
            padding: "8px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: actionable ? "pointer" : "not-allowed",
            minHeight: "36px",
            boxShadow: actionable
              ? "0 0 0 1px rgba(201, 168, 76, 0.2), 0 4px 12px rgba(201, 168, 76, 0.15)"
              : "none",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          {pending === "approving" ? "Approving…" : "Approve"}
        </button>
      </div>
    </article>
  );
}
