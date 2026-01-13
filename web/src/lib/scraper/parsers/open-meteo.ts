import { ScraperDefinition } from '../types';
import { registerParser } from '../registry';
import { ACTIVE_CITY } from '@/config/app';

// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
const WMO_CODES: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Drizzle: Light',
    53: 'Drizzle: Moderate',
    55: 'Drizzle: Dense',
    56: 'Freezing Drizzle: Light',
    57: 'Freezing Drizzle: Dense',
    61: 'Rain: Slight',
    63: 'Rain: Moderate',
    65: 'Rain: Heavy',
    66: 'Freezing Rain: Light',
    67: 'Freezing Rain: Heavy',
    71: 'Snow fall: Slight',
    73: 'Snow fall: Moderate',
    75: 'Snow fall: Heavy',
    77: 'Snow grains',
    80: 'Rain showers: Slight',
    81: 'Rain showers: Moderate',
    82: 'Rain showers: Violent',
    85: 'Snow showers: Slight',
    86: 'Snow showers: Heavy',
    95: 'Thunderstorm: Slight or moderate',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
};

export const OPEN_METEO_PARSER: ScraperDefinition = {
    id: 'open_meteo',
    sourceType: 'API',
    // Uses coords from active city config
    url: `https://api.open-meteo.com/v1/forecast?latitude=${ACTIVE_CITY.coords.lat}&longitude=${ACTIVE_CITY.coords.lng}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,wind_speed_10m&hourly=uv_index,cape,soil_moisture_3_to_9cm,shortwave_radiation&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=${encodeURIComponent(ACTIVE_CITY.timezone)}&forecast_days=7`,
    parser: (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            const current = data.current;
            const daily = data.daily;
            const hourly = data.hourly;

            // Zip daily arrays
            const dailyForecast = daily?.time?.map((date: string, i: number) => {
                const dayDate = new Date(date);
                return {
                    date: date,
                    dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: ACTIVE_CITY.timezone }),
                    high: daily.temperature_2m_max[i],
                    low: daily.temperature_2m_min[i],
                    precipChance: daily.precipitation_probability_max?.[i] ?? 0,
                    condition: WMO_CODES[daily.weather_code?.[i]] || 'Unknown'
                };
            }) || [];

            // Safety check for hourly data (in case URL is old/cached)
            if (!hourly) {
                return {
                    currentTemp: current?.temperature_2m,
                    conditionText: (WMO_CODES[current?.weather_code] || 'Unknown') + " (No Hourly Data)",
                    daily: dailyForecast
                };
            }

            // Find the index in "hourly" that matches the "current" time
            // Open-Meteo aligns current.time to the nearest hour interval usually.
            // If strict match fails, we default to the current hour based on local time.
            let hourIndex = hourly.time.indexOf(current.time);

            // Fallback if current.time (e.g. 12:15) doesn't perfectly match hourly (12:00)
            if (hourIndex === -1) {
                // Simple heuristic: match the first 13 chars (YYYY-MM-DDTHH)
                const currentHourStr = current.time.substring(0, 13);
                hourIndex = hourly.time.findIndex((t: string) => t.startsWith(currentHourStr));
            }

            // Safety fallback
            if (hourIndex === -1) hourIndex = 0;

            return {
                currentTemp: current.temperature_2m,
                conditionText: WMO_CODES[current.weather_code] || 'Unknown',
                precipProb: current.precipitation_probability,
                high: daily.temperature_2m_max ? daily.temperature_2m_max[0] : undefined,
                low: daily.temperature_2m_min ? daily.temperature_2m_min[0] : undefined,

                // Deep Dive Metrics (from Hourly)
                uvIndex: hourly.uv_index[hourIndex],
                cape: hourly.cape[hourIndex],
                soilMoisture: hourly.soil_moisture_3_to_9cm[hourIndex],
                solarRadiation: hourly.shortwave_radiation[hourIndex],

                // 7-day extended
                daily: dailyForecast
            };
        } catch (e: any) {
            console.error("Open-Meteo Parse Error", e);
            return {
                conditionText: "Parse Error: " + e.message
            };
        }
    }
};

// Self-register
registerParser(OPEN_METEO_PARSER);
