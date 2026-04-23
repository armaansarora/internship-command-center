"use client";
import { useMemo } from "react";
import {
  pipelineWeatherDelta,
  type WeatherInput,
} from "@/lib/penthouse/pipeline-weather";

/**
 * Reactive saturation delta for the ProceduralSkyline. Pure memo — the
 * underlying computation is cheap and deterministic, but keeping it behind a
 * hook lets us later add per-floor overrides without touching every consumer.
 */
export function usePipelineWeather(input: WeatherInput): number {
  return useMemo(() => pipelineWeatherDelta(input), [
    input.newApps,
    input.responses,
    input.rejections,
    input.staleCount,
    input.importantEmailCount,
  ]);
}
