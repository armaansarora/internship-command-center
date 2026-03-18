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

/**
 * Get a human-readable label for the time state.
 */
export function getTimeLabel(state: TimeState): string {
  const labels: Record<TimeState, string> = {
    dawn: "Dawn",
    morning: "Morning",
    midday: "Midday",
    afternoon: "Afternoon",
    golden_hour: "Golden Hour",
    dusk: "Dusk",
    night: "Night",
  };
  return labels[state];
}

/**
 * Calculate interpolation factor between two time states.
 * Returns a value 0-1 representing how far into the current state we are.
 */
export function getTimeProgress(hour: number, minutes: number): number {
  const ranges: Record<TimeState, [number, number]> = {
    dawn: [5, 7],
    morning: [7, 10],
    midday: [10, 14],
    afternoon: [14, 17],
    golden_hour: [17, 19],
    dusk: [19, 21],
    night: [21, 29], // wraps around midnight
  };

  const state = getTimeState(hour);
  const [start, end] = ranges[state];
  const totalMinutes = hour * 60 + minutes;
  const startMinutes = start * 60;
  const endMinutes = end * 60;

  return Math.max(0, Math.min(1, (totalMinutes - startMinutes) / (endMinutes - startMinutes)));
}
