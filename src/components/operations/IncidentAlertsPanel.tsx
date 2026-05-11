import { useState, type JSX } from "react";
import type { IncidentAlertView } from "@/lib/db/queries/operations-ops-rest";

/**
 * Incident Alerts Panel — recent rows from the Lighthouse Watchdog's
 * `incident_alerts` table. The watchdog (every 30 minutes) opens / stamps
 * reminders / resolves incidents; this panel is the read-only window for
 * the founder.
 *
 * Visual contract:
 *   - Open incidents first (red/amber by severity), then resolved (gold).
 *   - Status chip:
 *       open / crit  → red    #FF6B6B
 *       open / warn  → amber  #FFA500
 *       resolved     → gold   #C9A84C
 *   - When no incidents have ever been opened, show the "system quiet"
 *     empty state — that is the desired steady-state.
 *
 * No PII surfaces here: the watchdog never writes anything user-scoped
 * into `incident_alerts`. `last_seen_value` is a free-form snapshot
 * string (e.g. "stale by 4h 12m") authored by the watchdog itself.
 */

export interface IncidentAlertsPanelProps {
  /**
   * Recent incidents, open first then resolved. The container reader
   * (`getRecentIncidentAlerts`) returns them in display order so this
   * panel never re-sorts.
   */
  incidents: readonly IncidentAlertView[];
}

interface ChipStyle {
  color: string;
  label: string;
}

function chipFor(incident: IncidentAlertView): ChipStyle {
  if (!incident.open) {
    return { color: "#C9A84C", label: "Resolved" };
  }
  if (incident.severity === "crit") {
    return { color: "#FF6B6B", label: "Open · crit" };
  }
  return { color: "#FFA500", label: "Open · warn" };
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatRelative(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const eventMs = Date.parse(iso);
  if (!Number.isFinite(eventMs)) return iso;
  const deltaMs = nowMs - eventMs;
  if (deltaMs < MINUTE_MS) return "just now";
  if (deltaMs < HOUR_MS) return `${Math.floor(deltaMs / MINUTE_MS)}m ago`;
  if (deltaMs < DAY_MS) return `${Math.floor(deltaMs / HOUR_MS)}h ago`;
  return `${Math.floor(deltaMs / DAY_MS)}d ago`;
}

export function IncidentAlertsPanel({
  incidents,
}: IncidentAlertsPanelProps): JSX.Element {
  // `Date.now()` is captured once with a `useState` lazy initializer so
  // React-hooks purity is satisfied and the relative strings stay stable
  // across rerenders. The dashboard header already shows the snapshot
  // timestamp, so this relative time is "fresh enough."
  const [nowMs] = useState<number>(() => Date.now());

  const openCount = incidents.filter((i) => i.open).length;
  const headerSummary =
    incidents.length === 0
      ? "No incidents opened."
      : openCount > 0
        ? `${openCount} open / ${incidents.length} total`
        : `${incidents.length} resolved`;

  return (
    <section
      aria-labelledby="incident-alerts-heading"
      className="rounded-xl border border-white/10 bg-[#1A1A2E]/90 p-5 shadow-glass backdrop-blur-glass"
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="incident-alerts-heading"
          className="font-display text-lg text-[#C9A84C]"
        >
          Lighthouse incidents
        </h2>
        <p
          data-testid="incident-alerts-summary"
          className="font-data text-[10px] uppercase tracking-[0.18em] text-white/50"
        >
          {headerSummary}
        </p>
      </header>

      {incidents.length === 0 ? (
        <p
          data-testid="incident-alerts-empty"
          className="py-6 text-center font-body text-sm italic text-white/50"
        >
          System quiet — no incidents opened. The watchdog runs every 30
          minutes; rows appear here once a signal trips.
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
                  Opened
                </th>
                <th scope="col" className="py-2 pr-3 font-normal">
                  Status
                </th>
                <th scope="col" className="py-2 font-normal">
                  Snapshot
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => {
                const chip = chipFor(incident);
                return (
                  <tr
                    key={incident.id}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="py-3 pr-3 font-body font-normal text-white/85"
                    >
                      {incident.jobName}
                    </th>
                    <td
                      className="py-3 pr-3 font-data text-white/65 tabular-nums"
                      title={incident.openedAt}
                    >
                      {formatRelative(incident.openedAt, nowMs)}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        data-testid={`incident-chip-${incident.id}`}
                        className="inline-flex items-center rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.14em]"
                        style={{
                          color: chip.color,
                          borderColor: `${chip.color}55`,
                          backgroundColor: `${chip.color}1A`,
                        }}
                        aria-label={`Status: ${chip.label}`}
                      >
                        {chip.label}
                      </span>
                    </td>
                    <td
                      className="py-3 font-body text-white/70"
                      title={incident.lastSeenValue ?? undefined}
                    >
                      {incident.lastSeenValue ?? "—"}
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
