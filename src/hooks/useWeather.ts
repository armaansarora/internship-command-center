"use client";

import { useEffect, useRef, useState } from "react";
import type { WeatherCondition } from "@/app/api/weather/route";

const SESSION_WEATHER_KEY = "tower-weather-cache";
const REFETCH_INTERVAL_MS = 30 * 60 * 1000; // 30 min

interface WeatherCache {
  condition: WeatherCondition;
  fetchedAt: number;
}

interface UseWeatherResult {
  condition: WeatherCondition;
  isLoading: boolean;
}

/**
 * Fetches weather condition from /api/weather.
 * Caches in sessionStorage, re-fetches every 30 minutes.
 */
export function useWeather(): UseWeatherResult {
  const [condition, setCondition] = useState<WeatherCondition>("clear");
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWeather = async (): Promise<void> => {
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) return;

      const data: { condition: WeatherCondition } =
        (await res.json()) as { condition: WeatherCondition };

      const cacheEntry: WeatherCache = {
        condition: data.condition,
        fetchedAt: Date.now(),
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_WEATHER_KEY, JSON.stringify(cacheEntry));
      }

      setCondition(data.condition);
    } catch {
      // Silently fall back to clear
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check sessionStorage first
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(SESSION_WEATHER_KEY);
      if (raw) {
        try {
          const cached: WeatherCache = JSON.parse(raw) as WeatherCache;
          if (Date.now() - cached.fetchedAt < REFETCH_INTERVAL_MS) {
            setCondition(cached.condition);
            setIsLoading(false);
            // Still schedule re-fetch when the cache expires
            const remaining = REFETCH_INTERVAL_MS - (Date.now() - cached.fetchedAt);
            const t = setTimeout(() => { void fetchWeather(); }, remaining);
            return () => clearTimeout(t);
          }
        } catch {
          // Invalid cache — fetch fresh
        }
      }
    }

    void fetchWeather();

    // Re-fetch every 30 minutes
    intervalRef.current = setInterval(() => {
      void fetchWeather();
    }, REFETCH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { condition, isLoading };
}
