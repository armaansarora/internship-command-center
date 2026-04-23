/**
 * Time-of-day window detector for the Penthouse scene router.
 *
 * The Penthouse shows a different scene per time window:
 *   - morning     05:00 – 11:59 local
 *   - afternoon   12:00 – 16:59 local
 *   - evening     17:00 – 20:59 local
 *   - late-night  21:00 – 04:59 local
 *
 * The user's timezone comes from `user_profiles.timezone` (IANA string, e.g.
 * "America/New_York"). When absent we fall back to the server's local clock —
 * on Vercel that's UTC, which gives a sensible worst-case for the scene.
 */

export type TimeOfDay = "morning" | "afternoon" | "evening" | "late-night";

export const TIME_OF_DAY_WINDOWS = {
  morning: { startHour: 5, endHour: 12 },
  afternoon: { startHour: 12, endHour: 17 },
  evening: { startHour: 17, endHour: 21 },
  "late-night": { startHour: 21, endHour: 5 }, // wraps past midnight
} as const;

/**
 * Return the current TimeOfDay window for `now` interpreted in timezone `tz`.
 * When `tz` is omitted or invalid, uses the runtime's local clock.
 */
export function timeOfDayFor(now: Date, tz?: string): TimeOfDay {
  const hour = getLocalHour(now, tz);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "late-night";
}

/**
 * Pull the hour component out of `now` as expressed in `tz`. Clamps to [0, 23].
 */
function getLocalHour(now: Date, tz?: string): number {
  if (!tz) return now.getHours();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: tz,
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return now.getHours();
    // "en-US, hour12:false" yields "0"–"23"; some runtimes emit "24" at exactly
    // midnight — normalise to 0.
    const h = parseInt(hourPart.value, 10);
    if (!Number.isFinite(h)) return now.getHours();
    return ((h % 24) + 24) % 24;
  } catch {
    return now.getHours();
  }
}
