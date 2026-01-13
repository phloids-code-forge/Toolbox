import { ScraperDefinition } from '../types';
import { registerParser } from '../registry';
import { ACTIVE_CITY } from '@/config/app';

export const OPENWEATHER_PARSER: ScraperDefinition = {
    id: 'openweathermap',
    sourceType: 'API',
    // Uses coords from active city config
    // Uses forecast endpoint (5 day / 3 hour) to get daily aggregation
    url: `https://api.openweathermap.org/data/2.5/forecast?lat=${ACTIVE_CITY.coords.lat}&lon=${ACTIVE_CITY.coords.lng}&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`,
    parser: (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            const list = data.list || [];

            // Group by date (YYYY-MM-DD)
            const days: Record<string, { high: number, low: number, condition: string, pops: number[] }> = {};

            list.forEach((item: any) => {
                const date = item.dt_txt.split(' ')[0]; // "2026-01-12"
                if (!days[date]) {
                    days[date] = {
                        high: -999,
                        low: 999,
                        condition: '',
                        pops: [] // Probability of precipitation
                    };
                }

                // Update High/Low
                if (item.main.temp_max > days[date].high) days[date].high = item.main.temp_max;
                if (item.main.temp_min < days[date].low) days[date].low = item.main.temp_min;

                // Collect POP (Probability of Precipitation)
                days[date].pops.push(item.pop || 0);

                // Take midday condition (usually around 12:00 or 15:00) as representative
                if (item.dt_txt.includes("12:00") || item.dt_txt.includes("15:00") || !days[date].condition) {
                    days[date].condition = item.weather?.[0]?.description
                        ? item.weather[0].description.charAt(0).toUpperCase() + item.weather[0].description.slice(1)
                        : 'Unknown';
                }
            });

            // Convert to array
            const daily = Object.entries(days).map(([dateStr, d]) => {
                const date = new Date(dateStr);
                const maxPop = Math.max(...d.pops);
                return {
                    date: dateStr,
                    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    high: d.high,
                    low: d.low,
                    precipChance: Math.round(maxPop * 100), // OWM gives 0-1 float
                    condition: d.condition
                };
            }).slice(0, 5); // Limit to 5 days usually

            // Current is the first item in the list effectively
            const currentItem = list[0] || {};

            return {
                currentTemp: currentItem.main?.temp,
                conditionText: currentItem.weather?.[0]?.description
                    ? currentItem.weather[0].description.charAt(0).toUpperCase() + currentItem.weather[0].description.slice(1)
                    : 'Unknown',
                high: daily[0]?.high,
                low: daily[0]?.low,
                precipProb: daily[0]?.precipChance,
                daily
            };
        } catch (e) {
            console.error("OpenWeatherMap Parse Error", e);
            return {};
        }
    }
};

// Self-register
registerParser(OPENWEATHER_PARSER);
