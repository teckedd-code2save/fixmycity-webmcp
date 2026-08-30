import { json } from '@/lib/civic-db';

const ACCRA = { latitude: 5.6037, longitude: -0.187 };

export async function GET() {
  const query = new URLSearchParams({
    latitude: String(ACCRA.latitude),
    longitude: String(ACCRA.longitude),
    current: 'temperature_2m,precipitation,rain,weather_code,wind_speed_10m',
    hourly: 'precipitation_probability',
    forecast_hours: '6',
    timezone: 'Africa/Accra',
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);

    const data = (await response.json()) as {
      current?: {
        time?: string;
        temperature_2m?: number;
        precipitation?: number;
        rain?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      hourly?: { precipitation_probability?: number[] };
    };
    const current = data.current;
    if (!current) throw new Error('Weather provider returned no current conditions');

    const rainChance = Math.max(0, ...(data.hourly?.precipitation_probability ?? [0]));
    const rainWatch = rainChance >= 55 || (current.rain ?? 0) > 0;
    return json({
      source: 'Open-Meteo',
      location: 'Accra',
      observedAt: current.time,
      temperatureC: current.temperature_2m,
      precipitationMm: current.precipitation ?? 0,
      windKph: current.wind_speed_10m,
      weatherCode: current.weather_code,
      next6HoursRainChance: rainChance,
      rainWatch,
    });
  } catch (error) {
    return json(
      {
        error: 'Live weather is temporarily unavailable.',
        detail: error instanceof Error ? error.message : 'Unknown weather error',
      },
      503,
    );
  }
}
