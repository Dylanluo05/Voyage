import { useEffect, useState } from 'react';

interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitation: number;
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌡️';
}

function weatherDescription(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 49) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function geocodeWithGoogle(address: string): Promise<{ lat: number; lng: number }> {
  const cacheKey = `geocode:${address}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return Promise.resolve(JSON.parse(cached) as { lat: number; lng: number });

  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        sessionStorage.setItem(cacheKey, JSON.stringify(coords));
        resolve(coords);
      } else {
        reject(new Error(`Geocode failed: ${status}`));
      }
    });
  });
}

interface Props {
  destination: string;
  startDate: string;
  endDate: string;
}

export default function WeatherWidget({ destination, startDate, endDate }: Props) {
  const [days, setDays] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      setLoading(true);
      try {
        // Use Google Maps Geocoder — handles abbreviations like "NYC", "LA", etc.
        const { lat: latitude, lng: longitude } = await geocodeWithGoogle(destination);

        // Open-Meteo forecast supports up to 16 days ahead; archive covers the past.
        // If the trip end is >16 days in the future, no data exists yet.
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const maxForecastDate = new Date(today);
        maxForecastDate.setDate(today.getDate() + 15);
        const maxForecastStr = maxForecastDate.toISOString().split('T')[0];

        // Clamp end date to what's actually available
        const fetchEnd = endDate > maxForecastStr ? maxForecastStr : endDate;
        // If the clamped end is before the start, no data available yet
        if (fetchEnd < startDate) {
          if (!cancelled) setLoading(false);
          return;
        }

        const baseUrl =
          endDate >= todayStr
            ? 'https://api.open-meteo.com/v1/forecast'
            : 'https://archive-api.open-meteo.com/v1/archive';

        const res = await fetch(
          `${baseUrl}?latitude=${latitude}&longitude=${longitude}` +
          `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
          `&timezone=auto&start_date=${startDate}&end_date=${fetchEnd}`
        );
        const data = await res.json();
        if (cancelled || !data.daily?.time?.length) return;

        const { time, weathercode, temperature_2m_max, temperature_2m_min, precipitation_sum } =
          data.daily;

        setDays(
          time.map((date: string, i: number) => ({
            date,
            maxTemp: Math.round(temperature_2m_max[i]),
            minTemp: Math.round(temperature_2m_min[i]),
            weatherCode: weathercode[i],
            precipitation: Math.round((precipitation_sum[i] ?? 0) * 10) / 10,
          }))
        );
      } catch (err) {
        console.error('[WeatherWidget]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [destination, startDate, endDate]);

  if (loading || days.length === 0) return null;

  return (
    <section id="weather-section" className="card">
      <h2 style={{ marginBottom: 12 }}>Weather</h2>
      <div className="weather-scroll">
        {days.map((day) => (
          <div key={day.date} className="weather-day">
            <div className="weather-date">
              {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="weather-emoji">{weatherEmoji(day.weatherCode)}</div>
            <div className="weather-desc">{weatherDescription(day.weatherCode)}</div>
            <div className="weather-temps">
              <span className="weather-max">{day.maxTemp}°</span>
              <span className="muted"> / {day.minTemp}°</span>
            </div>
            {day.precipitation > 0 && (
              <div className="muted small weather-precip">💧 {day.precipitation}mm</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
