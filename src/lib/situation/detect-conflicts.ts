/**
 * R7 — Calendar conflict detection.
 *
 * Pure function: given a list of events (interviews + calendar events)
 * within a rolling 14-day window, return the set of overlapping pairs.
 *
 * Event shape is deliberately narrow — `start` + `end` are epoch ms or
 * ISO strings. The detector is pure and deterministic: same inputs ⇒
 * same pairs, sorted by the earlier event's start.
 *
 * Idempotency across cron runs is enforced at the call site via the
 * notification metadata (pair-id hash), NOT inside this function.
 */

export interface ConflictEvent {
  id: string;
  kind: "interview" | "calendar_event";
  title: string;
  startMs: number;
  endMs: number;
}

export interface ConflictPair {
  a: ConflictEvent;
  b: ConflictEvent;
  /** Deterministic pair id — the same two events always hash to the same value. */
  pairId: string;
}

/** Stable pair id: kind:id pairs joined in lexicographic order, then colon-separated. */
export function computePairId(a: ConflictEvent, b: ConflictEvent): string {
  const k1 = `${a.kind}:${a.id}`;
  const k2 = `${b.kind}:${b.id}`;
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

/**
 * Returns all conflict pairs. Algorithm: sort by startMs, then check each
 * event's overlap with every subsequent event that starts before it ends.
 *
 * Pairs are deduplicated (A,B) === (B,A) via `pairId`. Self-pairs are
 * skipped. Zero-duration events (start === end) are excluded from output.
 *
 * Complexity: O(n²) worst case, but with the sort + early-break it's
 * near-linear for typical calendars where overlaps are rare.
 */
export function detectConflicts(events: ConflictEvent[]): ConflictPair[] {
  // Filter out zero-duration events — they can't overlap with anything.
  const filtered = events.filter((e) => e.endMs > e.startMs);
  const sorted = [...filtered].sort((x, y) => x.startMs - y.startMs);

  const pairs: ConflictPair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]!;
      // Since sorted, b.startMs >= a.startMs. Break early when b starts
      // after a ends — no further j can overlap with a.
      if (b.startMs >= a.endMs) break;
      // Self-pair check (different kinds+ids guaranteed by filtering).
      if (a.kind === b.kind && a.id === b.id) continue;
      const pairId = computePairId(a, b);
      if (seen.has(pairId)) continue;
      seen.add(pairId);
      pairs.push({ a, b, pairId });
    }
  }
  return pairs;
}
