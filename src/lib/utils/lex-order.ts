/**
 * Lexicographic ordering utilities for Kanban card positions.
 *
 * Positions are strings that sort lexicographically — e.g. "a" < "m" < "z".
 * We use base-36 characters (0-9, a-z) for density so new insertions between
 * two existing positions rarely need a full rebalance.
 *
 * Invariants:
 *   - An empty string ("") is treated as "before everything".
 *   - All generated strings are non-empty.
 *   - generateLexPosition(a, b) always returns a string s such that a < s < b
 *     (lexicographically), unless a === b, in which case we append a midpoint
 *     character.
 */

const BASE = 36;

/** Convert a base-36 character to its numeric value. */
function charVal(c: string): number {
  return parseInt(c, BASE);
}

/** Convert a numeric value (0–35) to its base-36 character. */
function valChar(n: number): string {
  return n.toString(BASE);
}

/**
 * Return a string strictly between `before` and `after`.
 *
 * - Pass `null` for `before` to get a value before `after`.
 * - Pass `null` for `after` to get a value after `before`.
 * - Pass both `null` to get the initial midpoint ("m").
 *
 * Algorithm: treat each character as a base-36 digit. Walk from the most
 * significant digit and find the midpoint. If the two strings have the same
 * prefix up to the length of the shorter one, append a new character in the
 * middle of the remaining range.
 */
export function generateLexPosition(
  before: string | null,
  after: string | null,
): string {
  const lo = before ?? "";
  const hi = after ?? "";

  // Edge case: identical bounds — append a midpoint character after `lo`
  if (lo === hi) {
    return lo + valChar(Math.floor(BASE / 2));
  }

  // Pad both strings to equal length with "0" (lowest char) on the right
  const maxLen = Math.max(lo.length, hi.length) + 1;
  const loDigits = lo.padEnd(maxLen, "0").split("").map((c) => charVal(c));
  const hiDigits = hi.padEnd(maxLen, "0").split("").map((c) => charVal(c === "" ? "0" : c));

  // Find the first position where lo and hi differ
  let diffIdx = 0;
  while (diffIdx < maxLen && loDigits[diffIdx] === hiDigits[diffIdx]) {
    diffIdx++;
  }

  // Build the midpoint digit-by-digit
  const result: number[] = [];

  for (let i = 0; i <= diffIdx; i++) {
    const low = loDigits[i] ?? 0;
    const high = hiDigits[i] ?? BASE - 1;
    const mid = Math.floor((low + high) / 2);
    result.push(mid);
    if (i === diffIdx) break;
  }

  // If mid === lo at the diffIdx, we need to go one level deeper
  if (result[diffIdx] === loDigits[diffIdx]) {
    // Append a character halfway between lo's next digit and BASE-1
    const nextLo = loDigits[diffIdx + 1] ?? 0;
    result.push(Math.floor((nextLo + (BASE - 1)) / 2));
  }

  // Convert digits back to string, trimming trailing "0"s (but keep at least 1 char)
  let str = result.map(valChar).join("");
  while (str.length > 1 && str.endsWith("0")) {
    str = str.slice(0, -1);
  }

  return str;
}

/**
 * Return the initial position for the first card in a column.
 * "m" sits in the middle of the base-36 alphabet, leaving room above and below.
 */
export function getInitialPosition(): string {
  return "m";
}

/**
 * Return a position guaranteed to sort after `last`.
 * If `last` is null, returns the initial position.
 */
export function getPositionAfter(last: string | null): string {
  if (last === null) {
    return getInitialPosition();
  }

  // Increment the last character of `last`. If it's already at max ('z'),
  // append a new character instead.
  const lastChar = last[last.length - 1];
  const val = charVal(lastChar);

  if (val < BASE - 1) {
    // Bump the last character up by ~half the remaining space for breathing room
    const bump = Math.floor((BASE - 1 - val) / 2) + 1;
    return last.slice(0, -1) + valChar(val + bump);
  }

  // Last character is already 'z' — append a new mid-range character
  return last + valChar(Math.floor(BASE / 2));
}
