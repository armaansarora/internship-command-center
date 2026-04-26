/**
 * Pin-colour pure helper.
 *
 * The Parlor's comp-band chart plots the user's offer(s) as pins against
 * the p25/p75 rails. Colour carries the verdict:
 *
 *   - red   → `value < p25` — below market
 *   - gold  → `value > p75` — above market (leverage)
 *   - ink   → otherwise     — inside the band (the common case)
 *
 * Boundary rule is strict-inequality: exactly p25 and exactly p75 both
 * resolve to "ink". Hitting the rail exactly is not "below" or "above"
 * market — it's the market.
 *
 * Pure function, no module-level state. Extracted out of the component so
 * the colour logic is test-first and reusable by future R10 tasks
 * (counter-offer draft visualisations, accept-signal overlays).
 */
export type PinColor = "red" | "gold" | "ink";

export function colorForPercentile(
  value: number,
  p25: number,
  p75: number,
): PinColor {
  if (value < p25) return "red";
  if (value > p75) return "gold";
  return "ink";
}
