"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import {
  DepartmentLane,
} from "./DepartmentLane";
import {
  type Dossier,
} from "./HandoffDossierCard";
import { CouncilTableEmpty } from "./CouncilTableEmpty";

/**
 * CouncilTable — surface that renders handoff dossier "packets" emitted by
 * the CEO orchestrator. Each row in `dossiers` is one agent's recommendation
 * inside a single bell-ring; rows sharing a `request_id` form one Council
 * convening. We group by request and render one table per convening so the
 * user can witness a structured briefing, not raw dispatch text.
 *
 * The component is intentionally dumb-ish: it takes a flat array of dossiers
 * + a parent-supplied next-action map keyed by request id, and routes the
 * approve/reject callbacks straight to the parent. The parent (Council Table
 * server section, or a notification surface) owns the actual server action,
 * optimistic updates, and toast wiring. Disagreement display, confidence
 * colour buckets, and status pills all live in the leaf components.
 *
 * Layout decisions:
 *   - Lanes sit horizontally on desktop (CSS grid auto-fill, min 280px),
 *     stack on mobile (< 768px) via a media-query style.
 *   - Each convening renders a small header ("Council convened · {when}"),
 *     the lane row, and an optional footer string the parent passes in for
 *     "next action".
 *   - Multiple dossiers from the same agent inside one request render as
 *     adjacent lanes — we DO NOT collapse them. Agents can legitimately
 *     emit multiple packets when peer-disagreement creates parallel
 *     recommendations, and collapsing would hide that texture.
 */
export interface CouncilTableProps {
  /** Flat list of dossiers (any request id, any agent). Empty → empty state. */
  dossiers: Dossier[];
  /**
   * Optional next-action sentence the parent computed for each request.
   * Keyed by `request_id`. Missing entries simply omit the footer.
   */
  nextActionByRequest?: Record<string, string>;
  /** Approve callback bubbled to the lane. */
  onApprove: (dossierId: string) => Promise<void>;
  /** Reject callback bubbled to the lane. */
  onReject: (dossierId: string) => Promise<void>;
  /** Optional Date.now() injector so the relative timestamp is testable. */
  now?: () => number;
  className?: string;
}

interface ConveningGroup {
  requestId: string;
  /** ISO timestamp of the earliest dossier in this convening. */
  createdAt: string;
  dossiers: Dossier[];
}

/**
 * Group a flat list of dossiers by `request_id`. Within each group the
 * dossiers are sorted by `created_at` ascending so lanes render in dispatch
 * order. Groups themselves are sorted by their earliest `created_at`
 * descending so the most recent convening is at the top.
 *
 * Exported for direct testing.
 */
export function groupDossiersByRequest(dossiers: Dossier[]): ConveningGroup[] {
  const buckets = new Map<string, Dossier[]>();
  for (const d of dossiers) {
    const arr = buckets.get(d.request_id);
    if (arr) arr.push(d);
    else buckets.set(d.request_id, [d]);
  }
  const groups: ConveningGroup[] = [];
  for (const [requestId, list] of buckets) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const createdAt = list[0]?.created_at ?? new Date(0).toISOString();
    groups.push({ requestId, createdAt, dossiers: list });
  }
  groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return groups;
}

/**
 * Render a relative timestamp ("3m ago") given an ISO string + current epoch.
 * Falls back to the original ISO if parsing fails. Exported for tests.
 */
export function formatRelative(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const delta = Math.max(0, nowMs - t);
  const sec = Math.round(delta / 1000);
  if (sec < 45) return "moments ago";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function CouncilTable({
  dossiers,
  nextActionByRequest,
  onApprove,
  onReject,
  now,
  className,
}: CouncilTableProps): JSX.Element {
  const groups = useMemo(() => groupDossiersByRequest(dossiers), [dossiers]);

  if (groups.length === 0) {
    return <CouncilTableEmpty />;
  }

  const nowMs = (now ?? Date.now)();

  return (
    <div
      data-testid="council-table"
      data-convening-count={groups.length}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        minWidth: 0,
      }}
    >
      {groups.map((group) => {
        const nextAction = nextActionByRequest?.[group.requestId];
        const relative = formatRelative(group.createdAt, nowMs);
        const conveningId = `council-${group.requestId}`;

        return (
          <section
            key={group.requestId}
            data-testid="council-convening"
            data-request-id={group.requestId}
            aria-labelledby={`${conveningId}-header`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              padding: "18px",
              borderRadius: "14px",
              background:
                "linear-gradient(180deg, rgba(15, 15, 28, 0.7) 0%, rgba(10, 10, 22, 0.75) 100%)",
              border: "1px solid rgba(201, 168, 76, 0.18)",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
              minWidth: 0,
            }}
          >
            {/* Header */}
            <header
              id={`${conveningId}-header`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "rgba(232, 201, 106, 0.95)",
                  letterSpacing: "0.02em",
                }}
              >
                Council convened
              </span>
              <span
                aria-hidden="true"
                style={{ color: "rgba(184, 184, 200, 0.45)", fontSize: "12px" }}
              >
                ·
              </span>
              <time
                dateTime={group.createdAt}
                data-testid="council-convening-time"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "rgba(184, 184, 200, 0.78)",
                  letterSpacing: "0.06em",
                }}
              >
                {relative}
              </time>
              <span
                aria-hidden="true"
                style={{ color: "rgba(184, 184, 200, 0.45)", fontSize: "12px" }}
              >
                ·
              </span>
              <span
                data-testid="council-convening-count"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "rgba(184, 184, 200, 0.7)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {group.dossiers.length} dossier
                {group.dossiers.length === 1 ? "" : "s"}
              </span>
            </header>

            {/* Lanes — grid auto-fill on desktop, stack on mobile via the
                CSS class below. */}
            <div
              className="council-lane-row"
              data-testid="council-lane-row"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "14px",
                alignItems: "stretch",
                width: "100%",
                minWidth: 0,
              }}
            >
              {group.dossiers.map((d) => (
                <DepartmentLane
                  key={d.id}
                  dossier={d}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </div>

            {/* Optional footer — next action sentence. */}
            {nextAction && (
              <footer
                data-testid="council-convening-next-action"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(201, 168, 76, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.22)",
                  fontFamily: "Satoshi, -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: "12.5px",
                  color: "rgba(245, 220, 160, 0.95)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "rgba(232, 201, 106, 0.85)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  Next action
                </span>
                <span>{nextAction}</span>
              </footer>
            )}
          </section>
        );
      })}

      <style>{`
        @media (max-width: 767px) {
          .council-lane-row {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
