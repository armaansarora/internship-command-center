import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { withAnonymousRateLimit } from "@/lib/rate-limit-middleware";
import { log } from "@/lib/logger";

export type WeatherCondition =
  | "clear"
  | "clouds"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "fog";

interface WeatherResponse {
  condition: WeatherCondition;
  temp?: number;
  icon?: string;
}

interface OpenWeatherResponse {
  weather: Array<{ main: string; icon: string }>;
  main: { temp: number };
}

const CACHE_REVALIDATE_SECONDS = 30 * 60;

function mapCondition(main: string): WeatherCondition {
  const lower = main.toLowerCase();
  if (lower === "thunderstorm") return "thunderstorm";
  if (lower === "rain" || lower === "drizzle") return "rain";
  if (lower === "snow") return "snow";
  if (lower === "fog" || lower === "mist" || lower === "haze" || lower === "smoke") {
    return "fog";
  }
  if (lower === "clouds") return "clouds";
  return "clear";
}

// Coarsen caller-supplied coordinates to ~11 km grid cells. Prevents a caller
// from busting the cache by jiggling lat/lon decimals.
function normaliseCoord(raw: string | null, fallback: string): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  if (value < -180 || value > 180) return fallback;
  return value.toFixed(1);
}

async function fetchOpenWeatherForGrid(lat: string, lon: string): Promise<WeatherResponse> {
  const apiKey = env().OPENWEATHER_API_KEY;
  if (!apiKey) {
    return { condition: "clear" };
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);

  if (!res.ok) {
    log.warn("weather.upstream_error", { status: res.status });
    return { condition: "clear" };
  }

  const owData = (await res.json()) as OpenWeatherResponse;
  const main = owData.weather?.[0]?.main ?? "Clear";
  const icon = owData.weather?.[0]?.icon;
  const temp = owData.main?.temp;

  return {
    condition: mapCondition(main),
    temp,
    icon,
  };
}

export async function GET(request: Request): Promise<Response> {
  const rate = await withAnonymousRateLimit(request);
  if (rate.response) return rate.response;

  const { searchParams } = new URL(request.url);
  const lat = normaliseCoord(searchParams.get("lat"), "40.7");
  const lon = normaliseCoord(searchParams.get("lon"), "-74.0");

  try {
    const getCached = unstable_cache(
      () => fetchOpenWeatherForGrid(lat, lon),
      ["api-weather", lat, lon],
      { revalidate: CACHE_REVALIDATE_SECONDS },
    );
    const response = await getCached();
    return NextResponse.json(response, { headers: rate.headers });
  } catch (err) {
    log.error("weather.fetch_failed", err);
    return NextResponse.json(
      { condition: "clear" } as WeatherResponse,
      { headers: rate.headers },
    );
  }
}
