import * as cheerio from 'cheerio';
import { ScraperDefinition } from '../types';
import { registerParser } from '../registry';

// NOTE: These selectors are hypothetical (best guess) and will need 
// to be tuned against the ACTUAL live HTML of these sites.
// We will build a "Debug Page" to help us fine-tune them.

export const KFOR_PARSER: ScraperDefinition = {
    id: 'kfor',
    sourceType: 'TV_STATION',
    url: 'https://kfor.com/weather/',
    headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "priority": "u=0, i",
        "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        // Do not commit browser session cookies or anti-bot tokens; rely on public headers only.
    },
    parser: (html: string) => {
        const $ = cheerio.load(html);

        // KFOR (Nexstar Media) typically puts current temp in a specific div
        // We will look for common class names found on Nexstar sites
        const tempText = $('.weather-current .temp').first().text().trim(); // e.g., "72°"
        const highText = $('.weather-today .high').first().text().trim();
        const lowText = $('.weather-today .low').first().text().trim();

        return {
            currentTemp: parseInt(tempText) || undefined,
            high: parseInt(highText) || undefined,
            low: parseInt(lowText) || undefined,
            conditionText: $('.weather-current .condition').first().text().trim(),
        };
    }
};

export const KWTV_PARSER: ScraperDefinition = {
    id: 'kwtv',
    sourceType: 'TV_STATION',
    url: 'https://www.news9.com/weather',
    parser: (html: string) => {
        const $ = cheerio.load(html);

        // KWTV stores data in a massive JSON blob inside a data attribute
        // Look for <bsp-weather-daily-module data-pageload-apidata="...">
        const el = $('bsp-weather-daily-module');
        const rawData = el.attr('data-pageload-apidata');

        if (!rawData) {
            console.warn("KWTV: No data-pageload-apidata found");
            return {};
        }

        try {
            // Decode HTML entities (mainly &quot;)
            const jsonString = rawData.replace(/&quot;/g, '"');
            const data = JSON.parse(jsonString);

            // The structure is items[0].metar.temperature.value
            // and items[0].hourly[...]
            const current = data.items?.[0]?.metar;
            if (!current) return {};

            // We could dig for high/low in the "forecast" or "week" module, 
            // but for now let's grab current conditions which we know are there.
            // (Daily Hi/Lo might be in `customizedJsData` if present, or we check the week module)

            return {
                currentTemp: current.temperature?.value,
                conditionText: current.weatherCode?.text,
                // We'll leave hi/low undefined for now unless we find them in this specific blob
            };
        } catch (e) {
            console.error("KWTV: JSON parse error", e);
            return {};
        }
    }
};

// Self-register both parsers
registerParser(KFOR_PARSER);
registerParser(KWTV_PARSER);
