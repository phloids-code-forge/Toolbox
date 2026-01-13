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
        "cookie": "_pxhd=f018fc579f48bcbbb5ca5d2ad61dc9e9dbdb1692c32975225358bcf14e64f9af:070a3bf7-effa-11f0-a673-e95af8c5f5c5; ndn=67f55307-8329-4cdf-a3fb-2df5a5892401-1768251759564; _pxvid=070a3bf7-effa-11f0-a673-e95af8c5f5c5; pxcts=0743109a-effa-11f0-8be6-0835cc28a9f7; last_visit_bc=1768251759866; OTGPPConsent=DBABLA~BVQqAAAAAACA.QA; usprivacy=1YNN; BCSessionID=c0ad2330-91c9-4661-8de0-624d0a1485d1; referralId=Direct; seg_sessionid=ffeaed16-1cd8-49c3-844b-72bee76220a4; sailthru_pageviews=1; _cb=H3diACyX7t5DNyyu6; _chartbeat2=.1768251760715.1768251760715.1.C6mYlwDtqePclKkFdGdt3KBVblfa.1; _cb_svref=external; s_ips=1352; nol_fpid=2sm2wkmsigyug95hhohhlhpamyij81768251760|1768251760999|1768251760999|1768251760999; sailthru_content=2d27d40e7eb9b359ea635eb127991816; sailthru_visitor=d13cb0a5-78a6-4733-8113-c353a19c5355; kndctr_19020C7354766EB60A4C98A4_AdobeOrg_cluster=or2; kndctr_19020C7354766EB60A4C98A4_AdobeOrg_identity=CiYxNTgwNTc1MDE5NTg3NzUxMDk4MTY0NDQ2ODgwMTEwNzgwMjQ0MRISCP%2D%5FkqC7MxABGAEqA09SMjAA8AH%5Fv5KguzM%3D; _px2=eyJ1IjoiMDc2ZjQzMDAtZWZmYS0xMWYwLTk4NWUtYWJjMGRmYmE2OTY2IiwidiI6IjA3MGEzYmY3LWVmZmEtMTFmMC1hNjczLWU5NWFmOGM1ZjVjNSIsInQiOjE3NjgyNTIwNjA3OTEsImgiOiI1MmM2ZmUwOWRhNmI1ZWYxNzk4MWZmMmFlNmZjYTRmYmUwMDllZGE2NzlhNGIzNjI1M2E5NDEwODhkM2NkOWY5In0=; _ga=GA1.2.284334207.1768251761; _gid=GA1.2.813985822.1768251761; permutive-id=7183cf8a-7135-4ef7-9be9-e832a68449f8; s_tp=4282; s_ppv=kfor%253Aweather%2C32%2C32%2C32%2C1352%2C3%2C1; s_plt=2.27%2Ckfor%3Aweather; repeat_visitor=1768251761814-250118; bob_session_id=1768251761814-259092; _gat_gtag_UA_27019157_1=1; OptanonConsent=isGpcEnabled=0&datestamp=Mon+Jan+12+2026+15%3A03%3A25+GMT-0600+(Central+Standard+Time)&version=202512.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=254717cf-5bd4-44fd-88cc-60d975ac6a1e&interactionCount=1&isAnonUser=1&landingPath=https%3A%2F%2Fkfor.com%2Fweather%2F&GPPCookiesCount=1&gppSid=7&groups=SSPD_BG%3A1%2CC0002%3A1%2CC0004%3A1%2CC0007%3A1%2CC0003%3A1%2CC0001%3A1&crTime=1768251805652"
    },
    parser: (html: string) => {
        const $ = cheerio.load(html);

        // KFOR (Nexstar Media) typically puts current temp in a specific div
        // We will look for common class names found on Nexstar sites
        const tempText = $('.weather-current .temp').first().text().trim(); // e.g., "72°"
        const highText = $('.weather-today .high').first().text().trim();
        const lowText = $('.weather-today .low').first().text().trim();

        return {
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
