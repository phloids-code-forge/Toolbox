"use server";

import { runScraper } from "@/lib/scraper/engine";
import { KFOR_PARSER, KWTV_PARSER } from "@/lib/scraper/parsers/okc";
import { NWS_PARSER } from "@/lib/scraper/parsers/nws";
import { OPEN_METEO_PARSER } from "@/lib/scraper/parsers/open-meteo";
import { OPENWEATHER_PARSER } from "@/lib/scraper/parsers/openweathermap";
import { WEATHERAPI_PARSER } from "@/lib/scraper/parsers/weatherapi";
import fs from 'fs/promises';
import path from 'path';

export async function testScrapeFn(stationId: string) {
    let parser = null;
    if (stationId === 'kfor') parser = KFOR_PARSER;
    if (stationId === 'kwtv') parser = KWTV_PARSER;
    if (stationId === 'nws') parser = NWS_PARSER;
    if (stationId === 'open_meteo') parser = OPEN_METEO_PARSER;
    if (stationId === 'openweathermap') parser = OPENWEATHER_PARSER;
    if (stationId === 'weatherapi') parser = WEATHERAPI_PARSER;

    if (!parser) return { success: false, error: "Unknown Station ID" };

    // Run the scraper
    const result = await runScraper(parser);

    // Save to DB
    const { saveSnapshot } = await import("@/app/actions/db-manage"); // Dynamic import to avoid cycles if any, or just safety
    await saveSnapshot(result);

    // DEBUG: Save the HTML/JSON to a file so we can inspect it
    if (!result.success && result.error?.includes('403')) {
        return result; // Don't try to fetch again if blocked
    }

    try {
        // Re-fetch using the engine's headers logic if we were really robust,
        // but here we just want a dump.
        // For NWS we need the headers.
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...(parser.headers || {})
        };

        const response = await fetch(parser.url, { headers });
        const text = await response.text();
        const debugPath = path.join(process.cwd(), `debug_${stationId}.html`); // .html extension for convenience, even if JSON
        await fs.writeFile(debugPath, text);
        console.log(`Saved debug output to ${debugPath}`);
    } catch (e) {
        console.error("Failed to save debug output", e);
    }

    return result;
}
