import { useState, type JSX } from "react";
import type {
  CronHealthRun,
  ProductionHealthSummary,
} from "@/lib/observability/production-health";

/**
 * Cron Health Panel — per-job "last run" status row, sourced from the
 * `cron_runs` table. Same source the Lighthouse Watchdog reads when it
 * decides whether to open a `cron-stale` incident (see
 * `production-health.ts` → `configuredCronJobNames` + `staleThreshold`).
 *
 * Visual contract:
 *   - One row per cron currently wired in `vercel.json` (the panel never
 *     hides a configured cron, even when it has zero runs — that's the
 *     state the operator most needs to see).
 *   - Status chip color encodes failure mode:
 *     stale (no run in N hours)   → red    #FF6B6B
 *     failing (success=false)     → amber  #FFA500
 *     queued / never-run          → grey   #6B7280
 *     ok                          → gold   #C9A84C
 *
 * Pure presentation. No env, no DB. The container fetches a
 * `ProductionHealthSummary["cron"]` (or `null` when the read fails) and
 * passes it down.
 */

export interface CronHealthPanelProps {
  /**
   * Cron summary shape from `readProductionHealthSummary().cron`. `null`
   * when the read failed entirely — the panel renders a single error row
   * rather than a 4-panel partial render.
   */
  cron: ProductionHealthSummary["cron"] | null;
}

type CronStatusKey = "ok" | "stale" | "failing" | "never";

const STATUS_STYLES: Record<
  CronStatusKey,
  { color: string; label: string }
> = {
  ok: { color: "#C9A84C", label: "OK" },
  stale: { color: "#FF6B6B", label: "Stale" },
  failing: { color: "#FFA500", label: "Failing" },
  never: { color: "#6B7280", label: "Never run" },
};

function classifyRun(run: CronHealthRun): CronStatusKey {
  if (run.startedAt === null) return "never";
  if (run.stale) return "stale";
  if (run.success === false) return "failing";
  return "ok";
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatRelative(iso: string | null, nowMs: number): string {
  if (!iso) return "never";
  const eventMs = Date.parse(iso);
  if (!Number.isFinite(eventMs)) return iso;
  const deltaMs = nowMs - eventMs;
  if (deltaMs < MINUTE_MS) return "just now";
  if (deltaMs < HOUR_MS) return `${Math.floor(deltaMs / MINUTE_MS)}m ago`;
  if (deltaMs < DAY_MS) return `${Math.floor(deltaMs / HOUR_MS)}h ago`;
  return `${Math.floor(deltaMs / DAY_MS)}d ago`;
}

function summaryLine(
  cron: ProductionHealthSummary["cron"] | null,
): string {
  if (!cron) return "Cron health unavailable.";
  const { configuredJobs, staleJobs, failingJobs } = cron;
  if (staleJobs.length === 0 && failingJobs.length === 0) {
    return `${configuredJobs} crons configured — all healthy.`;
  }
  const parts: string[] = [];
  if (staleJobs.length > 0) parts.push(`${staleJobs.length} stale`);
  if (failingJobs.length > 0) parts.push(`${failingJobs.length} failing`);
  return `${configuredJobs} crons configured — ${parts.join(", ")}.`;
}

export function CronHealthPanel({
  cron,
}: CronHealthPanelProps): JSX.Element {
  // `Date.now()` is impure — capture it once with a `useState` lazy
  // initializer so React-hooks purity is satisfied and the relative
  // strings stay stable across rerenders. Same pattern as the recent
  // activations + incident alerts panels.
  const [nowMs] = useState<number>(() => Date.now());
  const runs = cron?.lastRuns ?? [];

  return (
    <section
      aria-labelledby="cron-health-heading"
      className="rounded-xl border border-white/10 bg-[#1A1A2E]/90 p-5 shadow-glass backdrop-blur-glass"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="cron-health-heading"
          className="font-display text-lg text-[#C9A84C]"
        >
          Cron health
        </h2>
        <p
          data-testid="cron-health-summary"
          className="font-data text-[10px] uppercase tracking-[0.18em] text-white/50"
        >
          {summaryLine(cron)}
        </p>
      </header>

      {runs.length === 0 ? (
        <p
          data-testid="cron-health-empty"
          className="py-6 text-center font-body text-sm italic text-white/50"
        >
          {cron === null
            ? "Cron read unavailable. The watchdog is still authoritative."
            : "No cron runs recorded yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 font-data text-[10px] uppercase tracking-[0.14em] text-white/55">
                <th scope="col" className="py-2 pr-3 font-normal">
                  Job
                </th>
                <th scope="col" className="py-2 pr-3 font-normal">
                  Last started
                </th>
                <th scope="col" className="py-2 pr-3 font-normal">
                  Status
                </th>
                <th scope="col" className="py-2 font-normal">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const status = STATUS_STYLES[classifyRun(run)];
                const note =
                  run.errorMessage ??
                  (run.durationMs !== null
                    ? `${(run.durationMs / 1000).toFixed(1)}s`
                    : "—");
                return (
                  <tr
                    key={run.jobName}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="py-3 pr-3 font-body font-normal text-white/85"
                    >
                      {run.jobName}
                    </th>
                    <td
                      className="py-3 pr-3 font-data text-white/65 tabular-nums"
                      title={run.startedAt ?? "never"}
                    >
                      {formatRelative(run.startedAt, nowMs)}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        data-testid={`cron-status-${run.jobName}`}
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
                    <td className="py-3 font-body text-white/70" title={note}>
                      {note}
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
