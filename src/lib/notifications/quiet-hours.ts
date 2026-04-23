/**
 * R7.4 — Quiet-hours delivery window math.
 *
 * Partner non-negotiable: "Tubes queued during quiet hours arrive at wake-up,
 * never at 3am." This module is the single source of truth for when a
 * notification may be delivered. Called at insert time from
 * `createNotification`, *never* at delivery time — the pneumatic tube hook
 * simply filters `deliver_after <= now()` and trusts the stamped column.
 *
 * Semantics:
 *   - `quietHours == null` → deliver immediately (returns `now` ISO).
 *   - The `[start, end)` interval is **half-open** — `now == end` means we've
 *     just exited quiet hours and may deliver immediately.
 *   - Wrap-around (e.g. start="22:00", end="07:00") is explicitly supported:
 *     the quiet window spans midnight and ends the following day.
 *   - All math runs in the user's local timezone, regardless of the machine
 *     locale. We lean on `Intl.DateTimeFormat` for the TZ-aware breakdown —
 *     no date library; Node's built-in ICU covers every timezone we support.
 *
 * The returned ISO is always UTC (`.toISOString()`), which is the format
 * Supabase writes into `timestamptz` columns.
 */

export interface QuietHours {
  /** "HH:MM" in 24h format (user-local). */
  start: string;
  /** "HH:MM" in 24h format (user-local). Half-open upper bound. */
  end: string;
}

interface ComputeArgs {
  now: Date;
  userTimezone: string;
  quietHours: QuietHours | null;
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parse "HH:MM" into minutes-since-midnight. Throws on malformed input so
 * bad profile data surfaces loudly instead of silently mis-scheduling.
 */
function parseHHMM(s: string): number {
  const m = HHMM_RE.exec(s);
  if (!m) throw new Error(`Invalid quiet-hours time: ${JSON.stringify(s)}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Read a UTC instant as wall-clock parts in the user's timezone. Returns the
 * fields we need to reason about quiet-hours membership and to project a
 * target wall-clock time back to UTC.
 */
interface TzParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function tzParts(instant: Date, timeZone: string): TzParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(instant);
  const bag: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

/**
 * Find the UTC instant whose wall-clock in `timeZone` equals the supplied
 * wall-clock target. Works by successive approximation: we start with a
 * naive UTC guess, measure how far off the wall-clock projection is, then
 * correct by that offset. Two passes is enough to settle across every IANA
 * zone including DST springs-forward/falls-back — the first pass lands us
 * in the right hour, the second nails the minute.
 */
function zonedWallToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // Start from the naive UTC wall-clock.
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  for (let i = 0; i < 2; i += 1) {
    const parts = tzParts(guess, timeZone);
    const targetMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const projectedMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
    const diff = targetMs - projectedMs;
    if (diff === 0) return guess;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}

/**
 * Compute the earliest ISO timestamp at which a newly-created notification
 * may be delivered. Returns `now.toISOString()` when quiet hours are unset
 * or when `now` is already outside the quiet window.
 */
export function computeDeliverAfter(args: ComputeArgs): string {
  const { now, userTimezone, quietHours } = args;

  if (!quietHours) return now.toISOString();

  const startMin = parseHHMM(quietHours.start);
  const endMin = parseHHMM(quietHours.end);

  // A degenerate window (start == end) means "no quiet hours at all."
  // Accept defensively so a bad profile can't accidentally block delivery
  // forever.
  if (startMin === endMin) return now.toISOString();

  const parts = tzParts(now, userTimezone);
  const nowMin = parts.hour * 60 + parts.minute;

  // Half-open interval [start, end). The tube subscriber's own `<=` filter
  // means we want to schedule delivery at *exactly* the end-boundary, never
  // before.
  const inQuiet =
    startMin < endMin
      ? nowMin >= startMin && nowMin < endMin
      : nowMin >= startMin || nowMin < endMin;

  if (!inQuiet) return now.toISOString();

  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;

  // When the window wraps (start > end) the end-boundary is "tomorrow" iff
  // `nowMin >= startMin` (we're on the evening side of midnight). When
  // `nowMin < endMin` we're on the morning side — the end is still today.
  // For non-wrap windows the end is always today.
  const endTomorrow = startMin > endMin && nowMin >= startMin;

  // Build the target wall-clock date. We start from `parts.*` (user-local)
  // and optionally bump the day by one.
  let targetY = parts.year;
  let targetMo = parts.month;
  let targetD = parts.day;
  if (endTomorrow) {
    // Let Date roll month/year boundaries for us by constructing via UTC
    // math and reading back.
    const rolled = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
    targetY = rolled.getUTCFullYear();
    targetMo = rolled.getUTCMonth() + 1;
    targetD = rolled.getUTCDate();
  }

  const utc = zonedWallToUtc(targetY, targetMo, targetD, endH, endM, userTimezone);
  return utc.toISOString();
}
