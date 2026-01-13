import { ScraperDefinition } from '../types';
import { registerParser } from '../registry';
import { ACTIVE_CITY } from '@/config/app';

export const OPENWEATHER_PARSER: ScraperDefinition = {
    id: 'openweathermap',
    sourceType: 'API',
    // Uses coords from active city config
    url: `https://api.openweathermap.org/data/2.5/weather?lat=${ACTIVE_CITY.coords.lat}&lon=${ACTIVE_CITY.coords.lng}&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`,
    parser: (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);

            // OWM 'main' block has temp, humidity etc.
            const main = data.main || {};
            const weather = data.weather?.[0] || {};
            const wind = data.wind || {};

            return {
                currentTemp: main.temp,
                conditionText: weather.description ?
                    weather.description.charAt(0).toUpperCase() + weather.description.slice(1) // Capitalize
                    : 'Unknown',
                high: main.temp_max, // Note: In current weather API, this is deviation for the moment, not daily high
                low: main.temp_min,
                // OWM doesn't give precipProb in 'weather' endpoint easily without 'One Call'
            };
        } catch (e) {
            console.error("OpenWeatherMap Parse Error", e);
            return {};
        }
    }
};

// Self-register
registerParser(OPENWEATHER_PARSER);
