import { ScraperDefinition } from '../types';
import { registerParser } from '../registry';
import { ACTIVE_CITY } from '@/config/app';

// NWS API User-Agent MUST be unique/contactable or they block you.
const NWS_HEADERS = {
    'User-Agent': '(weather-wars.phloid.com, contact@phloid.com)',
    'Accept': 'application/geo+json'
};

/**
 * NWS Parser - Enhanced to fetch BOTH current observations AND 7-day forecast
 * 
 * The NWS API requires TWO calls:
 * 1. Current observations: /stations/{stationId}/observations/latest
 * 2. 7-day forecast: /gridpoints/{office}/{gridX},{gridY}/forecast
 * 
 * We handle this by making the forecast call in the parser since our engine
 * only supports a single URL. Observations URL is primary.
 */
export const NWS_PARSER: ScraperDefinition = {
    id: `nws-${ACTIVE_CITY.id}`,
    sourceType: 'API',
    // URL for Current Observations - uses station ID from city config
    url: `https://api.weather.gov/stations/${ACTIVE_CITY.nwsStationId}/observations/latest`,
    headers: NWS_HEADERS,
    parser: async (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            const props = data.properties;

            if (!props) return {};

            // ========================================
            // CURRENT TEMP (from observations)
            // ========================================
            // NWS gives temp in Celsius for observations. We must convert to Fahrenheit.
            // Sometimes temperature is null, try windChill as fallback
            let cel = props.temperature?.value;

            // Fallback chain: temperature -> windChill -> heatIndex
            if (cel === null || cel === undefined) {
                cel = props.windChill?.value;
            }
            if (cel === null || cel === undefined) {
                cel = props.heatIndex?.value;
            }

            let currentTemp: number | undefined = undefined;
            if (cel !== null && cel !== undefined) {
                currentTemp = (cel * 9 / 5) + 32;
            }

            const conditionText = String(props.textDescription || 'Clear');

            // Wind speed (in km/h from NWS, convert to mph)
            let windSpeed: number | undefined = undefined;
            if (props.windSpeed?.value !== null && props.windSpeed?.value !== undefined) {
                windSpeed = Math.round(props.windSpeed.value * 0.621371); // km/h to mph
            }

            // Wind chill for "feels like"
            let windChill: number | undefined = undefined;
            if (props.windChill?.value !== null && props.windChill?.value !== undefined) {
                windChill = (props.windChill.value * 9 / 5) + 32;
            }

            // Wind gusts (in km/h from NWS, convert to mph)
            let windGust: number | undefined = undefined;
            if (props.windGust?.value !== null && props.windGust?.value !== undefined) {
                windGust = Math.round(props.windGust.value * 0.621371); // km/h to mph
            }

            // Wind direction (in degrees)
            let windDirection: number | undefined = undefined;
            if (props.windDirection?.value !== null && props.windDirection?.value !== undefined) {
                windDirection = Math.round(props.windDirection.value);
            }

            console.log(`[NWS Parser] Raw temp: ${props.temperature?.value}, WindChill: ${props.windChill?.value}, Computed F: ${currentTemp}`);

            // ========================================
            // 7-DAY FORECAST (separate API call)
            // ========================================
            let daily: any[] = [];
            let high: number | undefined = undefined;
            let low: number | undefined = undefined;

            try {
                // Step 1: Get gridpoint data from coords
                const pointsUrl = `https://api.weather.gov/points/${ACTIVE_CITY.coords.lat},${ACTIVE_CITY.coords.lng}`;
                const pointsRes = await fetch(pointsUrl, { headers: NWS_HEADERS });

                if (pointsRes.ok) {
                    const pointsData = await pointsRes.json();
                    const forecastUrl = pointsData.properties?.forecast;

                    if (forecastUrl) {
                        // Step 2: Get the forecast
                        const forecastRes = await fetch(forecastUrl, { headers: NWS_HEADERS });

                        if (forecastRes.ok) {
                            const forecastData = await forecastRes.json();
                            const periods = forecastData.properties?.periods || [];

                            // NWS returns periods in order (Day, Night, Day, Night...)
                            // We need to pair them into full days
                            const dayMap: Record<string, { date: string; dayName: string; high: number | null; low: number | null; precipChance: number | null; condition: string }> = {};

                            for (const period of periods) {
                                // Parse date from startTime (e.g. "2026-01-15T18:00:00-06:00")
                                const dateStr = period.startTime.split('T')[0];
                                const date = new Date(period.startTime);
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                                if (!dayMap[dateStr]) {
                                    dayMap[dateStr] = {
                                        date: dateStr,
                                        dayName,
                                        high: null,
                                        low: null,
                                        precipChance: null,
                                        condition: ''
                                    };
                                }

                                // isDaytime tells us if this is high or low
                                if (period.isDaytime) {
                                    dayMap[dateStr].high = period.temperature;
                                    dayMap[dateStr].condition = period.shortForecast || '';
                                    // Extract precip chance from detailedForecast if available
                                    const precipMatch = period.detailedForecast?.match(/(\d+)\s*percent/i);
                                    if (precipMatch) {
                                        dayMap[dateStr].precipChance = parseInt(precipMatch[1]);
                                    }
                                } else {
                                    dayMap[dateStr].low = period.temperature;
                                }
                            }

                            // Convert to array and sort by date
                            daily = Object.values(dayMap)
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .slice(0, 7); // Limit to 7 days

                            // Set today's high/low for quick access
                            if (daily.length > 0) {
                                high = daily[0].high ?? undefined;
                                low = daily[0].low ?? undefined;
                            }

                            console.log(`[NWS Parser] Got ${daily.length} days of forecast`);
                        }
                    }
                }
            } catch (forecastError) {
                console.error('[NWS Parser] Forecast fetch error:', forecastError);
                // Continue without forecast - observations are still valid
            }

            // ========================================
            // FALLBACK: If currentTemp is still null, use today's high from forecast
            // ========================================
            if (currentTemp === undefined && high !== undefined) {
                currentTemp = high;
                console.log(`[NWS Parser] Using forecast high as currentTemp fallback: ${currentTemp}`);
            }

            return {
                currentTemp,
                conditionText,
                windSpeed,
                windGust,
                windDirection,
                windChill,
                high,
                low,
                daily
            };
        } catch (e) {
            console.error("NWS Parse Error", e);
            return {};
        }
    }
};

// Self-register
registerParser(NWS_PARSER);
