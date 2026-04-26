/**
 * CFO quip position resolver + copy table.
 *
 * Pure helpers that drive the one-time CFO quip delivered on the user's
 * first entry to the Negotiation Parlor after their first offer arrives.
 * The overlay component consumes these; the `parlorCfoQuipShown` pref
 * (server-read, client-written on dismissal) enforces the once-ever gate.
 *
 * No React imports, no side effects, no fetch — all decisions here live
 * in two small pure functions so the R10.15 accept gate + this task's
 * TDD pure-helper tests can verify the table without mounting anything.
 *
 * Five positions = five tonal notes:
 *   - below_p25 → "they're underpricing you" + interpolated delta percent
 *   - p25_to_p50 → "market, not celebratory"
 *   - p50_to_p75 → "solid offer"
 *   - above_p75 → "generous — negotiate on non-comp"
 *   - thin_data → "no benchmark data; negotiate terms that aren't ambiguous"
 *
 * Copy is conservative, CFO-voiced (direct, numbers-forward), and matches
 * the Negotiation Parlor's oak-and-gold tone: never sneering, never
 * gushing, always actionable.
 */

export type BandPosition =
  | "below_p25"
  | "p25_to_p50"
  | "p50_to_p75"
  | "above_p75"
  | "thin_data";

/**
 * Place the offer's base salary against the fetched comp bands. `thin_data`
 * takes priority over any numeric comparison — a missing or zero band is
 * not comparable and the CFO line must acknowledge that honestly rather
 * than quietly treating 0 as the floor.
 */
export function positionFor(
  base: number,
  p25: number,
  p50: number,
  p75: number,
): BandPosition {
  if (!p25 || !p50 || !p75) return "thin_data";
  if (base < p25) return "below_p25";
  if (base < p50) return "p25_to_p50";
  if (base < p75) return "p50_to_p75";
  return "above_p75";
}

/**
 * Map a resolved position to its CFO copy. `ctx.p25` is only consulted for
 * the `below_p25` branch, where we interpolate the underpricing delta as
 * a whole-number percent; a missing or zero p25 (shouldn't happen on that
 * branch, but we guard) falls back to a neutral "about 10%" so the line
 * stays grammatical.
 */
export function cfoQuipForPosition(
  pos: BandPosition,
  ctx: { base: number; p25?: number },
): string {
  switch (pos) {
    case "below_p25": {
      const pct =
        ctx.p25 && ctx.p25 > 0
          ? Math.round(((ctx.p25 - ctx.base) / ctx.p25) * 100)
          : 10;
      return `They're underpricing you by about ${pct}%. Walk in with confidence.`;
    }
    case "p25_to_p50":
      return "Market, not celebratory. There's room to push.";
    case "p50_to_p75":
      return "Solid offer. Small counter is safe; a big counter needs leverage.";
    case "above_p75":
      return "This is generous. Negotiate on non-comp — vesting, signing, start date.";
    case "thin_data":
      return "No benchmark data yet. Negotiate on terms that aren't ambiguous — start date, signing, equity refresh.";
  }
}
