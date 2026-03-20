import { NextRequest, NextResponse } from "next/server";

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

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
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
  if (lower === "fog" || lower === "mist" || lower === "haze" || lower === "smoke") return "fog";
  if (lower === "clouds") return "clouds";
  return "clear";
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // Default to NYC
  const lat = searchParams.get("lat") ?? "40.7128";
  const lon = searchParams.get("lon") ?? "-74.0060";
  const cacheKey = `${lat},${lon}`;

  // Return cached response if available
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;

  // No API key configured — return clear fallback
  if (!apiKey) {
    const fallback: WeatherResponse = { condition: "clear" };
    return NextResponse.json(fallback);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      const fallback: WeatherResponse = { condition: "clear" };
      return NextResponse.json(fallback);
    }

    const owData: OpenWeatherResponse = await res.json() as OpenWeatherResponse;
    const main = owData.weather?.[0]?.main ?? "Clear";
    const icon = owData.weather?.[0]?.icon;
    const temp = owData.main?.temp;

    const response: WeatherResponse = {
      condition: mapCondition(main),
      temp,
      icon,
    };

    setCached(cacheKey, response);
    return NextResponse.json(response);
  } catch {
    const fallback: WeatherResponse = { condition: "clear" };
    return NextResponse.json(fallback);
  }
}
