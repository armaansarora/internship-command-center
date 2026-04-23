/**
 * R8 warmth model.
 *
 * The Brief is explicit: warmth decay is *informative, not punitive*. No red
 * anywhere on cold cards. The palette cools from amber (hot, contacted today)
 * through cream (warm) through paper (neutral) through pale slate (cooling)
 * to cool blue-grey (cold). A cold card reads like an old photograph —
 * desaturated and quiet — not an alert.
 *
 * Formula — linear. Auditable. `warmth = max(0, 100 - days*2)`.
 *
 * Reached zero in 50 days. Good enough for an internship search cycle.
 * If usage data says this feels wrong we'll swap the curve in an R8.x
 * mini-phase — but shipping a simple rule now is better than a tuning knob.
 */

export type WarmthTier = "hot" | "warm" | "neutral" | "cooling" | "cold";

export function computeWarmth(lastContactAt: Date | null, now: Date): number {
  if (!lastContactAt) return 0;
  const days = Math.floor((now.getTime() - lastContactAt.getTime()) / 86_400_000);
  return Math.max(0, Math.min(100, 100 - days * 2));
}

export function computeWarmthTier(warmth: number): WarmthTier {
  if (warmth >= 94) return "hot";      // 0-2 days
  if (warmth >= 88) return "warm";     // 3-5 days (bucket ends at 6 days = 88)
  if (warmth >= 74) return "neutral";  // 7-13 days
  if (warmth >= 42) return "cooling";  // 14-29 days
  return "cold";                        // 30+ days
}

export interface WarmthPaletteEntry {
  /** Card background (paper tint). */
  bg: string;
  /** Card edge / border. */
  edge: string;
  /** Foreground text on the card. */
  text: string;
  /** Short human label used in aria and hover surfaces. */
  label: WarmthTier | Capitalize<WarmthTier>;
}

/**
 * Cool-blue ramp. ZERO red. Cold cards are a muted paper-blue, not a warning.
 */
export const WARMTH_PALETTE: Record<WarmthTier, WarmthPaletteEntry> = {
  hot:     { bg: "#E8B872", edge: "#D4A84C", text: "#3A2817", label: "Hot" },
  warm:    { bg: "#EDDFC6", edge: "#C9A84C", text: "#5C3A1E", label: "Warm" },
  neutral: { bg: "#D8CAB0", edge: "#A68E5E", text: "#5C3A1E", label: "Neutral" },
  cooling: { bg: "#BFC4C9", edge: "#8892A0", text: "#4A5560", label: "Cooling" },
  cold:    { bg: "#9BA9B8", edge: "#6E7E8F", text: "#3A4451", label: "Cold" },
};
