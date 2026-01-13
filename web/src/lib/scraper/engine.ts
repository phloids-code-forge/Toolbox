/**
 * Scraper Engine
 * Orchestrates fetching and parsing weather data from multiple sources.
 */

import { ScraperDefinition, WeatherSnapshot } from './types';
import { getActiveScrapers, listRegisteredIds } from './registry';
import { FEATURES } from '@/config/app';

// =============================================================
// STEALTH HEADERS
// =============================================================
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

// =============================================================
// FETCH WITH RETRY (Exponential Backoff)
// =============================================================
async function fetchWithRetry(
    url: string,
    headers: Record<string, string>,
    retries = 3
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(url, {
                headers,
                cache: 'no-store'
            });

            if (response.ok) {
                return response;
            }

            // If it's a 4xx error (except 429), don't retry - it won't help
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
        }

        // Exponential backoff: 1s, 2s, 4s...
        if (attempt < retries - 1) {
            const delay = 1000 * Math.pow(2, attempt);
            if (FEATURES.debugMode) {
                console.log(`[Engine] Retry ${attempt + 1}/${retries} in ${delay}ms...`);
            }
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw lastError || new Error(`Failed after ${retries} retries`);
}

// =============================================================
// RUN SINGLE SCRAPER
// =============================================================
export async function runScraper(scraper: ScraperDefinition): Promise<WeatherSnapshot> {
    const timestamp = new Date().toISOString();

    try {
        if (FEATURES.debugMode) {
            console.log(`[Scraper] Fetching ${scraper.id} from ${scraper.url}...`);
        }

        // Merge global stealth headers with scraper-specific headers
        const requestHeaders = {
            ...HEADERS,
            ...(scraper.headers || {})
        };

        // Fetch with retry
        const response = await fetchWithRetry(scraper.url, requestHeaders);
        const html = await response.text();

        // Parse
        const data = scraper.parser(html);

        // Construct Result
        return {
            sourceId: scraper.id,
            sourceType: scraper.sourceType,
            scrapedAt: timestamp,
            success: true,
            forecast: data
        };

    } catch (err) {
        console.error(`[Scraper] Failed for ${scraper.id}:`, err);
        return {
            sourceId: scraper.id,
            sourceType: scraper.sourceType,
            scrapedAt: timestamp,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
        };
    }
}

// =============================================================
// BOOTSTRAP: Import all parsers to trigger registration
// =============================================================
import './parsers/nws';
import './parsers/okc';
import './parsers/open-meteo';
import './parsers/openweathermap';
import './parsers/weatherapi';

// =============================================================
// BATCH OPERATIONS
// =============================================================
export async function runAllScrapers(): Promise<WeatherSnapshot[]> {
    const scrapers = getActiveScrapers();

    if (FEATURES.debugMode) {
        console.log(`[Engine] Registered: ${listRegisteredIds().join(', ')}`);
        console.log(`[Engine] Active: ${scrapers.map(s => s.id).join(', ')}`);
    }

    console.log(`[Scraper Engine] Starting batch for ${scrapers.length} sources...`);

    // Run in parallel
    const promises = scrapers.map(s => runScraper(s));
    const results = await Promise.all(promises);

    return results;
}

/**
 * Run a specific scraper by ID.
 */
export async function runScraperById(id: string): Promise<WeatherSnapshot | null> {
    const scrapers = getActiveScrapers();
    const scraper = scrapers.find(s => s.id === id);

    if (!scraper) {
        console.warn(`[Engine] Scraper '${id}' not found or not enabled.`);
        return null;
    }

    return runScraper(scraper);
}
