"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TimeState } from "@/types/ui";
import { getTimeState } from "@/lib/day-night";

interface DayNightContextValue {
  timeState: TimeState;
  hour: number;
  minutes: number;
}

const DayNightContext = createContext<DayNightContextValue>({
  timeState: "night",
  hour: 22,
  minutes: 0,
});

export function useDayNight() {
  return useContext(DayNightContext);
}

/**
 * DayNightProvider — sets `data-time` on <html> based on the user's local time.
 * Updates every 60 seconds. CSS custom properties in globals.css respond to
 * the data-time attribute to control sky gradient, ambient light, city lights, etc.
 */
export function DayNightProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DayNightContextValue>(() => {
    const now = new Date();
    return {
      timeState: getTimeState(now.getHours()),
      hour: now.getHours(),
      minutes: now.getMinutes(),
    };
  });

  const updateTime = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const timeState = getTimeState(hour);

    setState({ timeState, hour, minutes });

    // Set the data-time attribute on <html> for CSS
    document.documentElement.setAttribute("data-time", timeState);
  }, []);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initial set
    updateTime();

    // Update every 60 seconds
    intervalRef.current = setInterval(updateTime, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateTime]);

  return (
    <DayNightContext.Provider value={state}>
      {children}
    </DayNightContext.Provider>
  );
}
