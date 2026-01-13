import { ScraperDefinition } from '../types';
import { registerParser } from '../registry';
import { ACTIVE_CITY } from '@/config/app';

export const WEATHERAPI_PARSER: ScraperDefinition = {
    id: 'weatherapi',
    sourceType: 'API',
    // Uses coords from active city config, 7-day forecast (Starter plan)
    url: `https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHERAPI_API_KEY}&q=${ACTIVE_CITY.coords.lat},${ACTIVE_CITY.coords.lng}&days=7&aqi=yes&alerts=yes`,
    parser: (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            const current = data.current || {};
            const forecastDay = data.forecast?.forecastday?.[0]?.day || {};

            // Map full 7-day forecast
            const daily = data.forecast?.forecastday?.map((day: any) => {
                const date = new Date(day.date);
                // Adjust for time zone if needed, but UTC date string usually works ok for simple displays
                // "date": "2026-01-12"

                return {
                    date: day.date,
                    dayName: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
                    high: day.day.maxtemp_f,
                    low: day.day.mintemp_f,
                    precipChance: day.day.daily_chance_of_rain,
                    condition: day.day.condition?.text
                };
            }) || [];

            return {
                currentTemp: current.temp_f,
                conditionText: current.condition?.text || 'Unknown',
                high: forecastDay.maxtemp_f,
                low: forecastDay.mintemp_f,
                precipProb: forecastDay.daily_chance_of_rain,
                uvIndex: current.uv,
                daily
            };
        } catch (e) {
            console.error("WeatherAPI Parse Error", e);
            return {};
        }
    }
};

// Self-register
registerParser(WEATHERAPI_PARSER);
