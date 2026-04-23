/**
 * Pipeline-weather — maps overnight pipeline activity to a small saturation
 * delta that the ProceduralSkyline can apply to its hue.
 *
 * Brief: "skyline reflects pipeline weather — good nights, more gold; bad
 * nights, grayer — subtly, 5% saturation shifts."
 *
 * Output range is clamped to [-0.05, +0.05]. Negative = desaturated (dim),
 * positive = saturated (gold). The skyline renderer reads this as a
 * multiplier offset — 0 means "no shift, render as if outside the Penthouse".
 */

export interface WeatherInput {
  /** Brand-new applications that landed overnight. */
  newApps: number;
  /** Status changes in the last 24h (not including new apps). Good signal. */
  responses: number;
  /** Rejections or withdrawals in the last 24h. */
  rejections: number;
  /** Applications marked stale in the pipeline. */
  staleCount: number;
  /** Interview invites / offers — strongest positive signal. */
  importantEmailCount?: number;
}

export const WEATHER_MIN = -0.05;
export const WEATHER_MAX = 0.05;

/**
 * Compute the saturation delta. Pure function: same input → same output.
 *
 * Weights (units: saturation points; each 0.01 = ~1% saturation shift):
 *   - 1 important email   → +0.03
 *   - 1 new app           → +0.01 (caps at +0.03)
 *   - 1 response          → +0.01 (caps at +0.02)
 *   - 1 rejection         → -0.015 (caps at -0.04)
 *   - 1 stale op (>= 3)   → -0.01 above the threshold (caps at -0.03)
 *
 * Summed then clamped. Caps per-signal so one enormous rejection pile
 * doesn't saturate the floor black.
 */
export function pipelineWeatherDelta(input: WeatherInput): number {
  const emailBoost = Math.min((input.importantEmailCount ?? 0) * 0.03, 0.05);
  const newAppBoost = Math.min(input.newApps * 0.01, 0.03);
  const responseBoost = Math.min(input.responses * 0.01, 0.02);
  const rejectionDrag = -Math.min(input.rejections * 0.015, 0.04);
  const staleDrag = input.staleCount >= 3
    ? -Math.min((input.staleCount - 2) * 0.01, 0.03)
    : 0;

  const raw = emailBoost + newAppBoost + responseBoost + rejectionDrag + staleDrag;
  return clamp(raw, WEATHER_MIN, WEATHER_MAX);
}

/**
 * Human-readable bucket for the computed delta — used for telemetry /
 * readable ledger notes. Not rendered to the user.
 */
export function weatherLabel(delta: number): "dim" | "cool" | "gold" {
  if (delta <= -0.02) return "dim";
  if (delta >= 0.02) return "gold";
  return "cool";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
