/**
 * Focus Mode (Fix #4) — pure configuration + cookie parser.
 *
 * No env reads, no I/O. The server action and the layout both depend on
 * this module. Keep it minimal so the cookie name and parsing rule have a
 * single source of truth.
 */

export const FOCUS_MODE_COOKIE_NAME = "tower_focus_mode";
export const FOCUS_MODE_COOKIE_MAX_AGE = 31_536_000; // 1 year (seconds)
export const FOCUS_MODE_VALUE_ON = "1";
export const FOCUS_MODE_VALUE_OFF = "0";

/**
 * Parse the cookie value. Anything except the exact string "1" reads as
 * false — defends against hand-edited cookies and ensures the default
 * (unset) is "world chrome on" rather than a user-confusing flicker.
 */
export function parseFocusModeCookie(value: string | undefined): boolean {
  return value === FOCUS_MODE_VALUE_ON;
}
