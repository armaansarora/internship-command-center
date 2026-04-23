"use client";

/**
 * Idle detail — the small visual reward that a returning user notices
 * subconsciously (a photo frame on the desk, a pen that's rolled, a
 * flickering lamp).
 *
 * Picked deterministically from `(userId, date)` so the same user sees the
 * same detail on the same day. Rotates organically across mornings.
 *
 * Override: if the user had a rejection in the last 24h, the detail switches
 * to `long-pause` — a signal to the parent scene that the CEO takes a few
 * extra seconds before speaking. Not randomised on rejection days.
 */
export type IdleDetailKind = "photo-frame" | "pen" | "lamp" | "long-pause";

const DAILY_POOL: ReadonlyArray<IdleDetailKind> = ["photo-frame", "pen", "lamp"];

/** Stable string hash (djb2) — pure, ASCII-safe, no dependencies. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickIdleDetail(options: {
  userId: string;
  /** YYYY-MM-DD. Caller supplies this so SSR/CSR agree. */
  dateIso: string;
  recentRejection?: boolean;
}): IdleDetailKind {
  if (options.recentRejection) return "long-pause";
  const idx = hash(`${options.userId}|${options.dateIso}`) % DAILY_POOL.length;
  return DAILY_POOL[idx];
}

/**
 * Hook wrapper around {@link pickIdleDetail}. The function is pure and cheap,
 * so we compute directly — the Compiler handles hot-path memoisation.
 */
export function useIdleDetail(options: {
  userId: string;
  dateIso: string;
  recentRejection?: boolean;
}): IdleDetailKind {
  return pickIdleDetail(options);
}
