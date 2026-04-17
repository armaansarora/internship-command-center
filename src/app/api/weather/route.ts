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

// ─── In-memory cache (30 minutes) ──────────────────────────────────────────

interface CacheEntry {
  data: WeatherResponse;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function getCached(key: string): WeatherResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: WeatherResponse): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── OpenWeatherMap condition mapper ──────────────────────────────────────

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

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  const rate = await withAnonymousRateLimit(request);
  if (rate.response) return rate.response;

  const { searchParams } = new URL(request.url);
  const lat = normaliseCoord(searchParams.get("lat"), "40.7");
  const lon = normaliseCoord(searchParams.get("lon"), "-74.0");
  const cacheKey = `${lat},${lon}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: rate.headers });
  }

  const apiKey = env().OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { condition: "clear" } as WeatherResponse,
      { headers: rate.headers }
    );
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      log.warn("weather.upstream_error", { status: res.status });
      return NextResponse.json(
        { condition: "clear" } as WeatherResponse,
        { headers: rate.headers }
      );
    }

    const owData = (await res.json()) as OpenWeatherResponse;
    const main = owData.weather?.[0]?.main ?? "Clear";
    const icon = owData.weather?.[0]?.icon;
    const temp = owData.main?.temp;

    const response: WeatherResponse = {
      condition: mapCondition(main),
      temp,
      icon,
    };
    setCached(cacheKey, response);
    return NextResponse.json(response, { headers: rate.headers });
  } catch (err) {
    log.error("weather.fetch_failed", err);
    return NextResponse.json(
      { condition: "clear" } as WeatherResponse,
      { headers: rate.headers }
    );
  }
}
