import type { TimeState } from "@/types/ui";

/**
 * Determine the current time-of-day state based on the hour.
 * Used by DayNightProvider to set CSS custom properties.
 */
export function getTimeState(hour: number): TimeState {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 10) return "morning";
  if (hour >= 10 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 19) return "golden_hour";
  if (hour >= 19 && hour < 21) return "dusk";
  return "night";
}
