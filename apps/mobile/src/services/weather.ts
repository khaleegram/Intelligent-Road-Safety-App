import type { WeatherSnapshot } from '../types';
import { storage } from './storage';

const CACHE_KEY = 'weather_cache_v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

type WeatherCacheEntry = WeatherSnapshot & {
  lat: number;
  lng: number;
  fetchedAt: number;
};

export type WeatherConditionKey =
  | 'Clear'
  | 'Cloudy'
  | 'Fog'
  | 'Drizzle'
  | 'Rain'
  | 'Snow'
  | 'Thunderstorm'
  | 'Unknown';

export function mapWmoCode(code: number): WeatherConditionKey {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const cached = await storage.get<WeatherCacheEntry | null>(CACHE_KEY, null);
  if (
    cached &&
    Date.now() - cached.fetchedAt < CACHE_TTL_MS &&
    Math.abs(cached.lat - lat) < 0.05 &&
    Math.abs(cached.lng - lng) < 0.05
  ) {
    return {
      tempC: cached.tempC,
      windKmh: cached.windKmh,
      code: cached.code,
      conditionKey: cached.conditionKey,
    };
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,weather_code,wind_speed_10m';

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Weather fetch failed');
  }

  const payload = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
  };

  const code = payload.current?.weather_code ?? -1;
  const snapshot: WeatherSnapshot = {
    tempC: payload.current?.temperature_2m ?? 0,
    windKmh: payload.current?.wind_speed_10m ?? 0,
    code,
    conditionKey: mapWmoCode(code),
  };

  await storage.set<WeatherCacheEntry>(CACHE_KEY, {
    ...snapshot,
    lat,
    lng,
    fetchedAt: Date.now(),
  });

  return snapshot;
}
