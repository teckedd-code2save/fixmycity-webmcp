'use client';

import { useEffect, useState } from 'react';
import { CloudRain, CloudSun } from 'lucide-react';

type Weather = {
  temperatureC: number;
  next6HoursRainChance: number | null;
  rainWatch: boolean;
};

export function WeatherStatus() {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/weather', { signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as Weather) : null))
      .then(setWeather)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const date = new Intl.DateTimeFormat('en-GH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Accra',
  }).format(new Date());

  if (!weather) return <div className="eyebrow"><CloudSun /> {date} · Weather connecting</div>;
  return (
    <div className="eyebrow" title="Live conditions supplied by Open-Meteo">
      {weather.rainWatch ? <CloudRain /> : <CloudSun />}
      {date} · {Math.round(weather.temperatureC)}°C · {weather.rainWatch ? (weather.next6HoursRainChance===null?'Rain expected':`Rain watch ${weather.next6HoursRainChance}%`) : 'No active rain watch'}
    </div>
  );
}
