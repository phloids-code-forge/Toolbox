export interface WeatherSnapshot {
    sourceId: string;
    sourceType: "TV_STATION" | "API";
    scrapedAt: string; // ISO Date

    // The data we extracted
    forecast?: {
        currentTemp?: number;
        high?: number;
        low?: number;
        precipProb?: number;
        conditionText?: string;
        windSpeed?: number;  // mph
        windChill?: number;  // Fahrenheit
        // Deep Dive Metrics
        uvIndex?: number;       // "Redhead Beware"
        soilMoisture?: number;  // Gardner's Gold
        soilTemp?: number;      // Morel Radar
        solarRadiation?: number; // Energy Potential
        cape?: number;          // Storm Energy

        // 7-Day Forecast Array
        daily?: {
            date: string; // YYYY-MM-DD
            dayName: string; // Mon, Tue
            high: number | null;
            low: number | null;
            precipChance: number | null;
            condition?: string;
        }[];
    };

    // Did it work?
    success: boolean;
    error?: string;
}

export interface ScraperDefinition {
    id: string; // e.g. "kfor"
    url: string;
    // Type of source: TV station (scraped) or API (JSON)
    sourceType: "TV_STATION" | "API";
    // Optional: Custom headers for this specific scraper (e.g. NWS User-Agent)
    headers?: Record<string, string>;
    // A function that takes the HTML/JSON and returns the snapshot
    // Supports async parsers for sources that need multiple API calls (e.g. NWS)
    parser: (html: string) => Partial<WeatherSnapshot["forecast"]> | Promise<Partial<WeatherSnapshot["forecast"]>>;
}
