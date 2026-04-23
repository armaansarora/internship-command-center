"use client";
import { useEffect, useState } from "react";
import { timeOfDayFor, type TimeOfDay } from "@/lib/penthouse/time-of-day";

/**
 * Reactive time-of-day window. Re-evaluates once per minute and on mount so
 * a long-open Penthouse tab reflects the scene boundary as it crosses.
 *
 * `tz` is the user's IANA timezone string. When omitted, uses the browser's
 * local clock.
 *
 * Server value is derived from `initialValue` — pass the server-computed
 * window through to avoid morning→afternoon flicker on first hydration.
 */
export function useTimeOfDay(options: {
  tz?: string;
  initialValue?: TimeOfDay;
} = {}): TimeOfDay {
  const { tz, initialValue } = options;
  const [value, setValue] = useState<TimeOfDay>(
    () => initialValue ?? timeOfDayFor(new Date(), tz)
  );

  useEffect(() => {
    // Re-check every 30s; the window only changes at hour boundaries so a
    // loose cadence is fine and avoids hammering the component tree.
    const tick = () => setValue(timeOfDayFor(new Date(), tz));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [tz]);

  return value;
}
