import { PRICING_CONFIG } from "@/lib/config/pricing-config";

/**
 * Season Pass tier accessor.
 *
 * Reads `PRICING_CONFIG.tiers.seasonPass` and `PRICING_CONFIG.seasonPass`
 * (the window definition). Centralizing the lookup keeps the marketing
 * surface from re-typing the season window in three places — if the
 * council ever shifts the recruiting window, only the config moves and
 * /pricing + /season-pass pick it up automatically.
 *
 * NEVER hard-code the price ($149), the months, or the year label in
 * marketing JSX. Always come through this module.
 */

/**
 * Year window the active season covers. The label is rendered alongside
 * the months so visitors know which cohort the pass unlocks.
 *
 * Derived once at module evaluation — bumping it requires a deploy, which
 * matches how a season window shift is reviewed.
 */
export const SEASON_WINDOW_LABEL = "2026-27" as const;

export interface SeasonPassTier {
  price: number;
  yearlyPrice: number;
  name: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function monthName(oneIndexed: number): string {
  return MONTH_NAMES[(oneIndexed - 1) % 12] ?? "Unknown";
}

function shortMonth(oneIndexed: number): string {
  return SHORT_MONTH_NAMES[(oneIndexed - 1) % 12] ?? "???";
}

/** End-of-month day count for non-leap years. February pessimistically 28. */
function endOfMonthDay(oneIndexed: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[(oneIndexed - 1) % 12] ?? 30;
}

/**
 * Lookup the Season Pass tier on PRICING_CONFIG. Returns the tier as
 * defined in the revenue-cadence config.
 */
export function getSeasonPassTier(): SeasonPassTier {
  return PRICING_CONFIG.tiers.seasonPass;
}

export const SEASON_START_MONTH = monthName(PRICING_CONFIG.seasonPass.startMonth);
export const SEASON_END_MONTH = monthName(PRICING_CONFIG.seasonPass.endMonth);
export const SEASON_START_DATE = `${shortMonth(PRICING_CONFIG.seasonPass.startMonth)} 1`;
export const SEASON_END_DATE = `${shortMonth(PRICING_CONFIG.seasonPass.endMonth)} ${endOfMonthDay(PRICING_CONFIG.seasonPass.endMonth)}`;

/** Single-line scope copy used on /pricing and /season-pass callouts. */
export function seasonPassScopeLine(): string {
  return `Limited to the ${SEASON_WINDOW_LABEL} internship season — ${SEASON_START_DATE} → ${SEASON_END_DATE}.`;
}

/** Human-readable range used inside body copy. */
export function seasonPassRange(): string {
  return `${SEASON_START_MONTH} 1 through ${SEASON_END_MONTH} ${endOfMonthDay(PRICING_CONFIG.seasonPass.endMonth)}`;
}
