"use client";
import {
  pipelineWeatherDelta,
  type WeatherInput,
} from "@/lib/penthouse/pipeline-weather";

/**
 * Reactive saturation delta for the ProceduralSkyline. Pure, inexpensive — no
 * memoisation needed (React Compiler handles hot paths). Kept behind a hook
 * so future per-floor overrides have one place to land.
 */
export function usePipelineWeather(input: WeatherInput): number {
  return pipelineWeatherDelta(input);
}
