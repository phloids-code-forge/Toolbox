import { ScraperDefinition } from '../types';
import { registerParser } from '../registry';
import { ACTIVE_CITY } from '@/config/app';

// NWS API User-Agent MUST be unique/contactable or they block you.
const NWS_HEADERS = {
    'User-Agent': '(weather-wars.phloid.com, contact@phloid.com)',
    'Accept': 'application/geo+json'
};

export const NWS_PARSER: ScraperDefinition = {
    id: `nws-${ACTIVE_CITY.id}`,
    sourceType: 'API',
    // URL for Current Observations - uses station ID from city config
    url: `https://api.weather.gov/stations/${ACTIVE_CITY.nwsStationId}/observations/latest`,
    headers: NWS_HEADERS,
    parser: (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            const props = data.properties;

            if (!props) return {};

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

            let fah: number | undefined = undefined;
            if (cel !== null && cel !== undefined) {
                fah = (cel * 9 / 5) + 32;
            }

            console.log(`[NWS Parser] Raw temp: ${props.temperature?.value}, WindChill: ${props.windChill?.value}, Computed F: ${fah}`);

            return {
                currentTemp: fah,
                conditionText: String(props.textDescription || 'Clear'),
            };
        } catch (e) {
            console.error("NWS Parse Error", e);
            return {};
        }
    }
};

// Self-register
registerParser(NWS_PARSER);
