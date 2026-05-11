import type { JSX } from "react";

/**
 * ConsentTimeline — three-lane vertical timeline of the user's consent
 * state for the privacy-relevant surfaces of The Tower.
 *
 * Lanes:
 *   1. Networking matching   (in-app consent, version-tracked)
 *   2. Gmail connection      (OAuth grant)
 *   3. Calendar connection   (OAuth grant)
 *
 * State → colour:
 *   opted-in / connected  → gold     (#C9A84C — Tower trust accent)
 *   revoked / disconnected→ amber    (#E0A158 — softer warning, not red)
 *   never_opted_in        → muted    (rgba 0.32 — neutral, absent)
 *
 * Each lane shows a state badge + a relative-time string + an ISO
 * timestamp tooltip on hover/focus. Pure presentational — formatting
 * lives here, data fetching lives in the page route.
 */

export interface ConsentTimelineProps {
  networking: {
    state: "opted_in" | "revoked" | "never_opted_in";
    sinceIso: string | null;
    consentVersion: number | null;
  };
  gmail: { connected: boolean; sinceIso: string | null };
  calendar: { connected: boolean; sinceIso: string | null };
}

type LaneTone = "gold" | "amber" | "muted";

interface LaneRow {
  key: string;
  label: string;
  badgeText: string;
  tone: LaneTone;
  sinceIso: string | null;
  detail: string | null;
}

const GOLD = "#C9A84C";
const AMBER = "#E0A158";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const now = Date.now();
  const deltaSec = Math.floor((now - then) / 1000);
  if (deltaSec < 60) return "just now";
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month === 1 ? "" : "s"} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year === 1 ? "" : "s"} ago`;
}

function isoTooltip(iso: string | null): string {
  if (!iso) return "Not recorded";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function toneStyles(tone: LaneTone): {
  borderColor: string;
  background: string;
  color: string;
  dot: string;
} {
  if (tone === "gold") {
    return {
      borderColor: "rgba(201, 168, 76, 0.45)",
      background: "rgba(201, 168, 76, 0.08)",
      color: GOLD,
      dot: GOLD,
    };
  }
  if (tone === "amber") {
    return {
      borderColor: "rgba(224, 161, 88, 0.45)",
      background: "rgba(224, 161, 88, 0.08)",
      color: AMBER,
      dot: AMBER,
    };
  }
  return {
    borderColor: "rgba(255, 255, 255, 0.12)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "rgba(244, 236, 216, 0.56)",
    dot: "rgba(244, 236, 216, 0.32)",
  };
}

function buildLanes(props: ConsentTimelineProps): LaneRow[] {
  const lanes: LaneRow[] = [];

  // Networking lane.
  const n = props.networking;
  if (n.state === "opted_in") {
    lanes.push({
      key: "networking",
      label: "Warm-intro networking",
      badgeText: "Opted in",
      tone: "gold",
      sinceIso: n.sinceIso,
      detail:
        n.consentVersion !== null
          ? `Consent v${n.consentVersion}`
          : null,
    });
  } else if (n.state === "revoked") {
    lanes.push({
      key: "networking",
      label: "Warm-intro networking",
      badgeText: "Revoked",
      tone: "amber",
      sinceIso: n.sinceIso,
      detail:
        n.consentVersion !== null
          ? `Last accepted v${n.consentVersion}`
          : null,
    });
  } else {
    lanes.push({
      key: "networking",
      label: "Warm-intro networking",
      badgeText: "Never opted in",
      tone: "muted",
      sinceIso: null,
      detail: null,
    });
  }

  // Gmail lane.
  lanes.push({
    key: "gmail",
    label: "Gmail connection",
    badgeText: props.gmail.connected ? "Connected" : "Disconnected",
    tone: props.gmail.connected
      ? "gold"
      : props.gmail.sinceIso
      ? "amber"
      : "muted",
    sinceIso: props.gmail.sinceIso,
    detail: null,
  });

  // Calendar lane.
  lanes.push({
    key: "calendar",
    label: "Calendar connection",
    badgeText: props.calendar.connected ? "Connected" : "Disconnected",
    tone: props.calendar.connected
      ? "gold"
      : props.calendar.sinceIso
      ? "amber"
      : "muted",
    sinceIso: props.calendar.sinceIso,
    detail: null,
  });

  return lanes;
}

export function ConsentTimeline(
  props: ConsentTimelineProps,
): JSX.Element {
  const lanes = buildLanes(props);

  return (
    <section
      aria-labelledby="consent-timeline-title"
      data-testid="consent-timeline"
      className="rounded-xl p-5 md:p-6"
      style={{
        background: "rgba(20, 22, 38, 0.72)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <h2
        id="consent-timeline-title"
        className="mb-4 text-lg md:text-xl font-semibold"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#F4ECD8",
        }}
      >
        Consent timeline
      </h2>

      <ol
        className="relative flex flex-col gap-4 md:gap-5"
        role="list"
        style={{
          fontFamily: "'Satoshi', system-ui, sans-serif",
        }}
      >
        {/* Spine line — purely decorative; the lanes are the semantics. */}
        <span
          aria-hidden="true"
          className="absolute left-[7px] top-1 bottom-1 w-px"
          style={{ background: "rgba(255, 255, 255, 0.08)" }}
        />

        {lanes.map((lane) => {
          const t = toneStyles(lane.tone);
          const rel = relativeTime(lane.sinceIso);
          const tip = isoTooltip(lane.sinceIso);
          return (
            <li
              key={lane.key}
              className="relative pl-7"
              data-testid={`consent-lane-${lane.key}`}
              data-tone={lane.tone}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-2 inline-block h-[14px] w-[14px] rounded-full"
                style={{
                  background: t.dot,
                  boxShadow:
                    lane.tone === "gold"
                      ? "0 0 12px rgba(201, 168, 76, 0.35)"
                      : "none",
                  border: "2px solid rgba(20, 22, 38, 0.95)",
                }}
              />
              <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-3">
                <span
                  className="text-sm md:text-base font-medium"
                  style={{ color: "#F4ECD8" }}
                >
                  {lane.label}
                </span>
                <span
                  className="inline-flex items-center gap-2 self-start rounded-full px-2.5 py-0.5 text-xs font-medium"
                  data-testid={`consent-badge-${lane.key}`}
                  data-tone={lane.tone}
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: t.borderColor,
                    background: t.background,
                    color: t.color,
                    letterSpacing: "0.02em",
                  }}
                >
                  {lane.badgeText}
                </span>
              </div>
              <div
                className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: "rgba(244, 236, 216, 0.58)",
                }}
              >
                <time
                  dateTime={lane.sinceIso ?? undefined}
                  title={tip}
                  aria-label={
                    lane.sinceIso
                      ? `${lane.badgeText} — ${tip}`
                      : `${lane.badgeText} — no timestamp recorded`
                  }
                >
                  {rel}
                </time>
                {lane.detail !== null && (
                  <span aria-hidden="true">·</span>
                )}
                {lane.detail !== null && <span>{lane.detail}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
