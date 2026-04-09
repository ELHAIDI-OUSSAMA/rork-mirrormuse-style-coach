import * as Location from 'expo-location';
import { WeatherCondition, WeatherSnapshot } from '@/types';

type OpenMeteoResponse = {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const weatherCache = new Map<string, { data: OpenMeteoResponse; fetchedAt: number }>();
const geocodeCache = new Map<string, string>();

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCoordinatesKey(coords: Coordinates): string {
  return `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
}

function mapWeatherCodeToCondition(code: number | undefined, windSpeed?: number): WeatherCondition {
  if (typeof windSpeed === 'number' && windSpeed >= 35) return 'windy';
  if (code === undefined) return 'sunny';
  if (code === 0 || code === 1) return 'sunny';
  if ([2, 3, 45, 48].includes(code)) return 'cloudy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)
  ) {
    return 'rainy';
  }
  return 'cloudy';
}

async function getCoordinates(): Promise<Coordinates | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  let status = permission.status;

  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

async function reverseGeocodeLabel(coords: Coordinates): Promise<string | undefined> {
  const key = formatCoordinatesKey(coords);
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  try {
    const geocode = await Location.reverseGeocodeAsync(coords);
    const first = geocode[0];
    if (!first) return undefined;

    const city = first.city || first.subregion;
    const region = first.region;
    const label = city && region ? `${city}, ${region}` : city || region || undefined;
    if (label) {
      geocodeCache.set(key, label);
    }
    return label;
  } catch {
    return undefined;
  }
}

async function fetchForecast(coords: Coordinates): Promise<OpenMeteoResponse> {
  const key = formatCoordinatesKey(coords);
  const now = Date.now();
  const cached = weatherCache.get(key);

  if (cached && now - cached.fetchedAt < WEATHER_CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({
    latitude: `${coords.latitude}`,
    longitude: `${coords.longitude}`,
    timezone: 'auto',
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '3',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Weather API failed with ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  weatherCache.set(key, { data, fetchedAt: now });
  return data;
}

export async function getLiveWeatherForDate(date?: string): Promise<WeatherSnapshot> {
  const targetDate = date || getTodayISO();
  const coords = await getCoordinates();

  if (!coords) {
    throw new Error('Location permission denied');
  }

  const [forecast, locationLabel] = await Promise.all([
    fetchForecast(coords),
    reverseGeocodeLabel(coords),
  ]);

  const dailyTimes = forecast.daily?.time || [];
  const targetIndex = Math.max(
    0,
    dailyTimes.indexOf(targetDate) >= 0 ? dailyTimes.indexOf(targetDate) : 0
  );

  const minTemp = forecast.daily?.temperature_2m_min?.[targetIndex];
  const maxTemp = forecast.daily?.temperature_2m_max?.[targetIndex];
  const fallbackTemp = typeof minTemp === 'number' && typeof maxTemp === 'number'
    ? (minTemp + maxTemp) / 2
    : undefined;

  const isToday = targetDate === getTodayISO();
  const temperature = isToday && typeof forecast.current?.temperature_2m === 'number'
    ? forecast.current.temperature_2m
    : fallbackTemp ?? forecast.current?.temperature_2m ?? 20;

  const weatherCode = forecast.daily?.weather_code?.[targetIndex] ?? forecast.current?.weather_code;
  const rainProbability = forecast.daily?.precipitation_probability_max?.[targetIndex] ?? 0;
  const condition = mapWeatherCodeToCondition(weatherCode, forecast.current?.wind_speed_10m);

  return {
    temperature: Math.round(temperature),
    condition,
    rainProbability: Math.round(rainProbability),
    date: targetDate,
    location: locationLabel || 'Current location',
  };
}
