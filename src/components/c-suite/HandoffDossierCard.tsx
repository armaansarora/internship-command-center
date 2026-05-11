"use client";

import type { JSX } from "react";
import { useId, useMemo, useState } from "react";
import type { Row } from "@/db/database.types";

/**
 * HandoffDossierCard — standalone single-dossier presentation.
 *
 * Same row shape and visual vocabulary as `DepartmentLane` but works without
 * a parent Council context: it carries its own header, body, and expand
 * toggle, and is the canonical mount point when a dossier needs to surface
 * outside the Council Table (e.g. pneumatic-tube notifications, dossier
 * deep-links). DepartmentLane composes this card and layers the
 * approve/reject footer on top.
 *
 * The component is intentionally read-only — no decision buttons here. Action
 * affordances belong to DepartmentLane, which holds the parent's
 * approve/reject callbacks.
 */
export type Dossier = Row<"handoff_dossiers">;

/**
 * Evidence item shape the dossier extractor emits. Stored as jsonb (`unknown`
 * in the row type) so the schema can evolve without a migration; we narrow
 * to this shape at render time. Anything that doesn't match falls through to
 * a count-only "Based on N records" line.
 */
export interface DossierEvidenceItem {
  kind?: string;
  id?: string;
  summary?: string;
}

/** Disagreement note shape. Free-form jsonb; we accept either a bare string
 *  or `{ note: string, with?: string }` so the writer side stays flexible. */
export interface DossierDisagreement {
  note: string;
  /** Optional peer this dossier disagrees with (e.g., "cfo"). */
  with?: string;
}

const CONFIDENCE_PALETTE = {
  low: "#FF6B6B",
  mid: "#FFA500",
  high: "#C9A84C",
  veryHigh: "#8BD17C",
  unknown: "#6B7280",
} as const;

export type ConfidenceBucket = keyof typeof CONFIDENCE_PALETTE;

/**
 * Map a 0–100 confidence to a colour bucket. Null/undefined and out-of-range
 * values fall through to the unknown grey so the card never crashes on a
 * malformed row. Exported for the tests + the lane.
 */
export function confidenceBucket(score: number | null | undefined): ConfidenceBucket {
  if (score === null || score === undefined || Number.isNaN(score)) return "unknown";
  if (score < 0 || score > 100) return "unknown";
  if (score < 40) return "low";
  if (score < 70) return "mid";
  if (score < 90) return "high";
  return "veryHigh";
}

/** Hex for a confidence value. */
export function confidenceColor(score: number | null | undefined): string {
  return CONFIDENCE_PALETTE[confidenceBucket(score)];
}

const STATUS_COPY: Record<Dossier["status"], { label: string; tone: string }> = {
  draft: { label: "Drafting", tone: "rgba(107, 114, 128, 0.85)" },
  ready: { label: "Ready", tone: "rgba(201, 168, 76, 0.95)" },
  approved: { label: "Approved", tone: "rgba(139, 209, 124, 0.95)" },
  rejected: { label: "Declined", tone: "rgba(255, 107, 107, 0.95)" },
  executed: { label: "Executed", tone: "rgba(139, 209, 124, 0.95)" },
  expired: { label: "Expired", tone: "rgba(107, 114, 128, 0.85)" },
};

const PERMISSION_COPY: Record<Dossier["permission_needed"], string> = {
  none: "No permission needed",
  draft: "Permission: draft",
  send: "Permission: send",
};

/**
 * Narrow an `unknown` evidence value into a `DossierEvidenceItem[]`.
 * Anything that doesn't look like an array of objects becomes `[]`. We keep
 * unknown-shaped entries (e.g. missing `summary`) so the count still reflects
 * the writer's intent.
 */
export function parseEvidence(value: unknown): DossierEvidenceItem[] {
  if (!Array.isArray(value)) return [];
  const out: DossierEvidenceItem[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    out.push({
      kind: typeof r.kind === "string" ? r.kind : undefined,
      id: typeof r.id === "string" ? r.id : undefined,
      summary: typeof r.summary === "string" ? r.summary : undefined,
    });
  }
  return out;
}

/**
 * Narrow an `unknown` disagreement value into a `DossierDisagreement | null`.
 *
 * Accepts three on-disk shapes:
 *   1. `{ withAgent, reason }` — the canonical shape `dossier-extractor`
 *      emits (matches the Zod schema field names).
 *   2. `{ with?, note }` — legacy shape from earlier prototypes.
 *   3. bare string — older free-form note.
 *
 * The card always renders `with` + `note` internally, so the parse step
 * normalizes whichever shape the jsonb cell holds into the read model.
 * Returning a single canonical reader shape keeps the JSX site simple and
 * insulates it from future schema migrations.
 */
export function parseDisagreement(value: unknown): DossierDisagreement | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return { note: value };
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const r = value as Record<string, unknown>;
    const note =
      (typeof r.note === "string" && r.note) ||
      (typeof r.reason === "string" && r.reason) ||
      undefined;
    if (!note || note.trim().length === 0) return null;
    const withAgent =
      (typeof r.with === "string" && r.with) ||
      (typeof r.withAgent === "string" && r.withAgent) ||
      undefined;
    return { note, with: withAgent };
  }
  return null;
}

export interface HandoffDossierCardProps {
  dossier: Dossier;
  /** Render the open-questions + full evidence list inline. The card has its
   *  own toggle when this is absent so it works standalone. */
  expanded?: boolean;
  /** Hide the per-card expand toggle (DepartmentLane controls expansion itself). */
  hideToggle?: boolean;
  /** Optional extra className on the outer wrapper. */
  className?: string;
}

/**
 * Single dossier card. Renders agent badge, confidence dot, status pill,
 * recommendation sentence, proposed action, evidence summary, permission
 * chip, and an optional expanded section with open questions and a full
 * evidence list. No decision buttons — DepartmentLane adds those.
 */
export function HandoffDossierCard({
  dossier,
  expanded,
  hideToggle = false,
  className,
}: HandoffDossierCardProps): JSX.Element {
  const evidence = useMemo(() => parseEvidence(dossier.evidence), [dossier.evidence]);
  const disagreement = useMemo(
    () => parseDisagreement(dossier.disagreement),
    [dossier.disagreement],
  );

  const [localExpanded, setLocalExpanded] = useState(false);
  const isControlled = expanded !== undefined;
  const isOpen = isControlled ? Boolean(expanded) : localExpanded;
  const detailsId = useId();

  const statusCopy = STATUS_COPY[dossier.status];
  const confidenceLabel =
    dossier.confidence === null
      ? "Confidence not estimated"
      : `${dossier.confidence}% confidence`;

  const ownerLabel = dossier.owner.toUpperCase();
  const evidenceCount = evidence.length;
  const evidenceSummary =
    evidenceCount === 0
      ? "No supporting records cited"
      : `Based on ${evidenceCount} record${evidenceCount === 1 ? "" : "s"}`;

  return (
    <div
      data-testid="handoff-dossier-card"
      data-dossier-id={dossier.id}
      data-status={dossier.status}
      data-owner={dossier.owner}
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        borderRadius: "12px",
        background:
          "linear-gradient(180deg, rgba(26, 26, 46, 0.92) 0%, rgba(20, 20, 36, 0.92) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(201, 168, 76, 0.22)",
        boxShadow:
          "0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        color: "rgba(232, 232, 240, 0.92)",
        minWidth: 0,
      }}
    >
      {/* Header: agent badge · confidence dot · status pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span
          data-testid="dossier-owner-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "rgba(201, 168, 76, 0.12)",
            border: "1px solid rgba(201, 168, 76, 0.45)",
            color: "rgba(232, 201, 106, 0.98)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          {ownerLabel}
        </span>

        <span
          data-testid="dossier-confidence-dot"
          data-confidence-bucket={confidenceBucket(dossier.confidence)}
          aria-label={confidenceLabel}
          title={confidenceLabel}
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: confidenceColor(dossier.confidence),
            boxShadow: `0 0 6px ${confidenceColor(dossier.confidence)}66`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "rgba(184, 184, 200, 0.75)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {confidenceLabel}
        </span>

        <span
          data-testid="dossier-status-pill"
          data-status={dossier.status}
          style={{
            marginLeft: "auto",
            padding: "3px 10px",
            borderRadius: "999px",
            background: "rgba(15, 15, 25, 0.55)",
            border: `1px solid ${statusCopy.tone}`,
            color: statusCopy.tone,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {statusCopy.label}
        </span>
      </div>

      {/* Body: recommendation sentence (large) */}
      <p
        data-testid="dossier-recommendation"
        style={{
          margin: 0,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(1rem, 1.4vw, 1.15rem)",
          lineHeight: 1.4,
          color: "rgba(245, 245, 250, 0.96)",
          fontWeight: 500,
        }}
      >
        {dossier.recommendation}
      </p>

      {/* Proposed action (smaller, mono) */}
      <p
        data-testid="dossier-proposed-action"
        style={{
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          lineHeight: 1.5,
          color: "rgba(201, 168, 76, 0.88)",
        }}
      >
        <span
          style={{
            color: "rgba(184, 184, 200, 0.6)",
            marginRight: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: "10px",
          }}
        >
          Proposes
        </span>
        {dossier.proposed_action}
      </p>

      {/* Evidence summary · permission chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          fontSize: "12px",
          color: "rgba(184, 184, 200, 0.85)",
        }}
      >
        <span data-testid="dossier-evidence-summary">{evidenceSummary}</span>
        <span aria-hidden="true" style={{ color: "rgba(184, 184, 200, 0.35)" }}>
          ·
        </span>
        <span
          data-testid="dossier-permission-chip"
          style={{
            padding: "2px 8px",
            borderRadius: "6px",
            background:
              dossier.permission_needed === "none"
                ? "rgba(139, 209, 124, 0.1)"
                : dossier.permission_needed === "send"
                  ? "rgba(255, 107, 107, 0.12)"
                  : "rgba(201, 168, 76, 0.12)",
            border:
              dossier.permission_needed === "none"
                ? "1px solid rgba(139, 209, 124, 0.4)"
                : dossier.permission_needed === "send"
                  ? "1px solid rgba(255, 107, 107, 0.45)"
                  : "1px solid rgba(201, 168, 76, 0.45)",
            color:
              dossier.permission_needed === "none"
                ? "rgba(139, 209, 124, 0.95)"
                : dossier.permission_needed === "send"
                  ? "rgba(255, 130, 130, 0.95)"
                  : "rgba(232, 201, 106, 0.95)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.06em",
          }}
        >
          {PERMISSION_COPY[dossier.permission_needed]}
        </span>
      </div>

      {/* Expand toggle — only when not externally controlled. */}
      {!hideToggle && !isControlled && (evidence.length > 0 || dossier.open_questions.length > 0 || disagreement) && (
        <button
          type="button"
          onClick={() => setLocalExpanded((s) => !s)}
          aria-expanded={isOpen}
          aria-controls={detailsId}
          data-testid="dossier-expand-toggle"
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            border: "1px solid rgba(201, 168, 76, 0.3)",
            color: "rgba(232, 201, 106, 0.9)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {isOpen ? "Hide details" : "Show details"}
        </button>
      )}

      {/* Expanded details (open questions, evidence list, disagreement note) */}
      {isOpen && (
        <div
          id={detailsId}
          data-testid="dossier-details"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            paddingTop: "10px",
            marginTop: "2px",
            borderTop: "1px dashed rgba(201, 168, 76, 0.22)",
          }}
        >
          {evidence.length > 0 && (
            <div>
              <h4
                style={{
                  margin: "0 0 6px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(184, 184, 200, 0.7)",
                }}
              >
                Evidence cited
              </h4>
              <ul
                data-testid="dossier-evidence-list"
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "12px",
                  color: "rgba(220, 220, 230, 0.85)",
                }}
              >
                {evidence.map((item, i) => (
                  <li key={item.id ?? `${i}`} data-evidence-kind={item.kind ?? "unknown"}>
                    {item.summary ?? item.id ?? "(no summary)"}
                    {item.kind ? (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          color: "rgba(184, 184, 200, 0.55)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        [{item.kind}]
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dossier.open_questions.length > 0 && (
            <div>
              <h4
                style={{
                  margin: "0 0 6px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(184, 184, 200, 0.7)",
                }}
              >
                Open questions
              </h4>
              <ul
                data-testid="dossier-open-questions"
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "12px",
                  color: "rgba(220, 220, 230, 0.85)",
                }}
              >
                {dossier.open_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {disagreement && (
            <div
              data-testid="dossier-disagreement"
              role="note"
              style={{
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 165, 0, 0.45)",
                background: "rgba(255, 165, 0, 0.08)",
                fontSize: "12px",
                color: "rgba(255, 200, 130, 0.95)",
                lineHeight: 1.5,
              }}
            >
              <strong
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginRight: "6px",
                  color: "rgba(255, 200, 130, 0.85)",
                }}
              >
                Disagrees{disagreement.with ? ` with ${disagreement.with.toUpperCase()}` : ""}
              </strong>
              {disagreement.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
