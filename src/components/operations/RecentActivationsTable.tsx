import { useState, type JSX } from "react";
import type { RecentActivationDispatch } from "@/lib/db/queries/operations-rest";

/**
 * Recent Activations — table of the N most recent
 * `activation_first_action` dispatches.
 *
 * Columns:
 *   - timestamp:    relative ("4m ago") with the full ISO in a title
 *                   attribute for the hover tooltip.
 *   - user:         truncated UUID (8-char prefix) — enough for the
 *                   founder to cross-reference with a session, never
 *                   PII.
 *   - status:       colored pill (queued/running/completed/failed).
 *   - first action: the dispatch's `summary` (CRO's recommendation),
 *                   truncated to 80 chars + "…".
 *
 * Pure presentation. No additional PII surfacing beyond the values
 * already in the dispatch row.
 */

export interface RecentActivationsTableProps {
  /** Recent dispatches, newest first. Empty array shows the empty state. */
  dispatches: readonly RecentActivationDispatch[];
}

const STATUS_STYLES: Record<
  RecentActivationDispatch["status"],
  { color: string; label: string }
> = {
  queued: { color: "#9CA3AF", label: "Queued" },
  running: { color: "#60A5FA", label: "Running" },
  completed: { color: "#C9A84C", label: "Completed" },
  failed: { color: "#FF6B6B", label: "Failed" },
};

const SUMMARY_LIMIT = 80;

function truncateSummary(summary: string | null): string {
  if (summary === null) return "—";
  const trimmed = summary.trim();
  if (trimmed.length === 0) return "—";
  if (trimmed.length <= SUMMARY_LIMIT) return trimmed;
  return `${trimmed.slice(0, SUMMARY_LIMIT).trimEnd()}…`;
}

function truncateUserId(userId: string): string {
  // 8 char prefix is enough to disambiguate among the live cohort while
  // still being short enough to read at a glance — and short of a full
  // UUID, this is not personally identifying on its own.
  return userId.slice(0, 8);
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatRelative(iso: string, nowMs: number): string {
  const eventMs = Date.parse(iso);
  if (!Number.isFinite(eventMs)) return iso;
  const deltaMs = nowMs - eventMs;
  if (deltaMs < 0) return "just now";
  if (deltaMs < MINUTE_MS) return "just now";
  if (deltaMs < HOUR_MS) {
    const m = Math.floor(deltaMs / MINUTE_MS);
    return `${m}m ago`;
  }
  if (deltaMs < DAY_MS) {
    const h = Math.floor(deltaMs / HOUR_MS);
    return `${h}h ago`;
  }
  const d = Math.floor(deltaMs / DAY_MS);
  return `${d}d ago`;
}

export function RecentActivationsTable({
  dispatches,
}: RecentActivationsTableProps): JSX.Element {
  // `Date.now()` is impure — capture it once with a `useState` lazy
  // initializer so React-hooks purity is satisfied and the relative
  // strings stay stable across rerenders. The dashboard parent owns
  // a separate "snapshot taken at" header so this is fine.
  const [nowMs] = useState<number>(() => Date.now());

  return (
    <section
      aria-labelledby="recent-activations-heading"
      className="rounded-xl border border-white/10 bg-[#1A1A2E]/90 p-5 shadow-glass backdrop-blur-glass"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="recent-activations-heading"
          className="font-display text-lg text-[#C9A84C]"
        >
          Recent activations
        </h2>
        <p className="font-data text-[10px] uppercase tracking-[0.18em] text-white/50">
          Last {dispatches.length || 0} dispatches
        </p>
      </header>

      {dispatches.length === 0 ? (
        <p
          data-testid="recent-activations-empty"
          className="py-6 text-center font-body text-sm italic text-white/50"
        >
          No activation dispatches yet. The first CRO recommendation will
          appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
                <th scope="col" className="py-2 pr-3 font-normal">
                  When
                </th>
                <th scope="col" className="py-2 pr-3 font-normal">
                  User
                </th>
                <th scope="col" className="py-2 pr-3 font-normal">
                  Status
                </th>
                <th scope="col" className="py-2 font-normal">
                  First action
                </th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((d) => {
                const status = STATUS_STYLES[d.status];
                return (
                  <tr
                    key={d.dispatchId}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td
                      className="py-3 pr-3 font-data text-white/70 tabular-nums"
                      title={d.createdAt}
                    >
                      {formatRelative(d.createdAt, nowMs)}
                    </td>
                    <td
                      className="py-3 pr-3 font-data text-white/55"
                      title={d.userId}
                    >
                      {truncateUserId(d.userId)}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        data-testid={`status-pill-${d.dispatchId}`}
                        className="inline-flex items-center rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.14em]"
                        style={{
                          color: status.color,
                          borderColor: `${status.color}55`,
                          backgroundColor: `${status.color}1A`,
                        }}
                        aria-label={`Status: ${status.label}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 font-body text-white/85">
                      <span
                        data-testid={`summary-${d.dispatchId}`}
                        title={d.summary ?? undefined}
                      >
                        {truncateSummary(d.summary)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
