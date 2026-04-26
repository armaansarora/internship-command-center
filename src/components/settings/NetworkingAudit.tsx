import type { JSX } from "react";

/**
 * Settings → Networking → "How your data is used".
 *
 * Presentational Server Component. Renders the last 20 match_events for
 * the current user as human-readable one-liners. Event rows are surfaced
 * every time the match-candidates route returns candidates to the user;
 * this surface is the user's audit log.
 *
 * No cross-user data is shown — counterparties are anonymized by HMAC key
 * server-side and that key is never displayed. Only `company_context`
 * (the company the caller is applying to — already their own data) and
 * the event's fired_at timestamp appear in visible copy. `edge_strength`
 * and `match_reason` are mirrored into a visually-hidden span for
 * screen-reader consumers who want the detail.
 *
 * The parent (settings page) performs the REST fetch and hands the rows
 * to this component via props so the component itself stays pure.
 */
export interface MatchEvent {
  id: string;
  companyContext: string;
  firedAt: string;
  edgeStrength: string;
  matchReason: string;
}

interface Props {
  events: MatchEvent[];
}

export function NetworkingAudit({ events }: Props): JSX.Element {
  return (
    <section
      className="w-full mt-8"
      aria-labelledby="section-networking-audit"
    >
      <h3
        id="section-networking-audit"
        className="font-playfair text-lg text-[#C9A84C] mb-2"
      >
        How your data is used
      </h3>
      <p className="text-sm text-white/70 mb-4">
        Your last 20 match events. Every time Tower surfaces a warm-intro
        candidate to you, the event is logged here. No contact data is
        shared across users — counterparties are anonymized before they
        ever reach your screen.
      </p>

      {events.length === 0 ? (
        <p className="text-sm text-white/50 italic">
          No matches yet. Once another Tower user has a warm contact at
          one of your target companies, events will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="text-sm text-white/80 flex justify-between gap-4"
            >
              <span>
                You were matched with a contact at {e.companyContext} on{" "}
                {formatDate(e.firedAt)}.
              </span>
              <span className="sr-only">
                Edge strength {e.edgeStrength}. Reason: {e.matchReason}.
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
