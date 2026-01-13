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

            return {
                currentTemp: current.temp_f,
                conditionText: current.condition?.text || 'Unknown',
                high: forecastDay.maxtemp_f,
                low: forecastDay.mintemp_f,
                precipProb: forecastDay.daily_chance_of_rain, // WeatherAPI gives chance of rain/snow separately, usually rain is dominant
                uvIndex: current.uv, // Nice, they give UV in current
            };
        } catch (e) {
            console.error("WeatherAPI Parse Error", e);
            return {};
        }
    }
};

// Self-register
registerParser(WEATHERAPI_PARSER);
