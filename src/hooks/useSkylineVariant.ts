"use client";

import { useDayNight } from "@/components/world/DayNightProvider";

export type SkylineVariant = "day" | "night";

/**
 * useSkylineVariant — selects day/night photo set based on DayNight context.
 *
 * Returns:
 *  - variant: "day" | "night"
 *  - isDark: whether the current time is considered dark (dusk/night)
 *  - crossfadeProgress: 0-1 for transitioning between variants
 */
export function useSkylineVariant() {
  const { timeState } = useDayNight();

  const isDark = timeState === "dusk" || timeState === "night";
  const variant: SkylineVariant = isDark ? "night" : "day";

  return { variant, isDark, timeState };
}
